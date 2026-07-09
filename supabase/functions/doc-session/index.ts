/**
 * Edge Function: doc-session
 *
 * Creates a Zoho Office Integrator editing session for an attachment and
 * returns the embedded-editor URL. The caller must be the attachment owner,
 * an admin, or a supervisor of the owner.
 *
 * Secrets required (npx supabase secrets set ...):
 *   ZOHO_OI_API_KEY  — Zoho Office Integrator API key
 *   DOC_SAVE_SECRET  — random string used to sign the save-callback URL
 * Optional:
 *   ZOHO_OI_BASE_URL — defaults to https://api.office-integrator.com
 *
 * Deploy:  npx supabase functions deploy doc-session --project-ref <ref>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ZOHO_BASE =
  Deno.env.get('ZOHO_OI_BASE_URL') ?? 'https://api.office-integrator.com';
const ZOHO_KEY = Deno.env.get('ZOHO_OI_API_KEY') ?? '';
const SAVE_SECRET = Deno.env.get('DOC_SAVE_SECRET') ?? '';
const BUCKET = 'attachments';

/** Editable extensions → Zoho service endpoint + save format (same ext). */
const EDITORS: Record<string, { endpoint: string; saveFormat: string }> = {
  docx: { endpoint: '/writer/officeapi/v1/documents', saveFormat: 'docx' },
  odt: { endpoint: '/writer/officeapi/v1/documents', saveFormat: 'odt' },
  rtf: { endpoint: '/writer/officeapi/v1/documents', saveFormat: 'rtf' },
  txt: { endpoint: '/writer/officeapi/v1/documents', saveFormat: 'txt' },
  xlsx: { endpoint: '/sheet/officeapi/v1/spreadsheets', saveFormat: 'xlsx' },
  ods: { endpoint: '/sheet/officeapi/v1/spreadsheets', saveFormat: 'ods' },
  csv: { endpoint: '/sheet/officeapi/v1/spreadsheets', saveFormat: 'csv' },
  pptx: { endpoint: '/show/officeapi/v1/presentations', saveFormat: 'pptx' },
  odp: { endpoint: '/show/officeapi/v1/presentations', saveFormat: 'odp' },
};

function extOf(nameOrUrl: string): string {
  return nameOrUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!ZOHO_KEY || !SAVE_SECRET) {
      return json(500, {
        error: 'Server not configured: set ZOHO_OI_API_KEY and DOC_SAVE_SECRET secrets.',
      });
    }

    const { attachmentId, lang } = await req.json();
    if (!attachmentId) return json(400, { error: 'attachmentId is required' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: 'Unauthorized' });
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: att, error: attErr } = await admin
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle();
    if (attErr || !att) return json(404, { error: 'Attachment not found' });

    // Once the parent achievement is approved its content is locked — no
    // more editing sessions, even if requested directly against this function.
    if (att.achievement_id) {
      const { data: ach } = await admin
        .from('achievements')
        .select('status')
        .eq('id', att.achievement_id)
        .maybeSingle();
      if (ach?.status === 'approved') {
        return json(403, { error: 'This achievement is approved; its document can no longer be edited.' });
      }
    }

    // Permission: the owner, or any supervisor ABOVE the owner in the
    // administrative chain (transitive — migration_v7).
    let allowed = att.owner_id === callerId;
    if (!allowed) {
      const { data: chain } = await admin.rpc('in_supervision_chain', {
        sup: callerId,
        target: att.owner_id,
      });
      allowed = chain === true;
    }
    if (!allowed) {
      // Fallback while migration_v7 hasn't been applied: direct link only.
      const { data: sup } = await admin
        .from('supervisions')
        .select('id')
        .eq('supervisor_id', callerId)
        .eq('subordinate_id', att.owner_id)
        .limit(1);
      allowed = !!sup && sup.length > 0;
    }
    if (!allowed) return json(403, { error: 'Not allowed to edit this document' });

    const fileName: string = att.name ?? att.url.split('?')[0].split('/').pop() ?? 'document';
    const editor = EDITORS[extOf(fileName)] ?? EDITORS[extOf(att.url)];
    if (!editor) return json(400, { error: 'Unsupported document type' });

    // Download the CURRENT file bytes from storage and hand them to Zoho as a
    // multipart upload. (Passing a URL instead proved unreliable — Zoho opened
    // a blank document when it could not resolve/fetch the link.)
    const cleanUrl = (att.url as string).split('?')[0];
    const marker = `/object/public/${BUCKET}/`;
    const markerIdx = cleanUrl.indexOf(marker);
    if (markerIdx < 0) return json(400, { error: 'Attachment is not a stored file' });
    const storagePath = decodeURIComponent(cleanUrl.slice(markerIdx + marker.length));
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from(BUCKET)
      .download(storagePath);
    if (dlErr || !fileBlob) {
      return json(500, { error: `Could not read the document: ${dlErr?.message ?? 'download failed'}` });
    }

    // The save callback overwrites the SAME storage object; the token proves
    // the request originated from a session we created.
    const token = await hmacHex(att.id, SAVE_SECRET);
    const saveUrl = `${supabaseUrl}/functions/v1/doc-save?attachment=${att.id}&token=${token}`;

    const { data: callerProf } = await admin
      .from('users_profile')
      .select('full_name')
      .eq('id', callerId)
      .maybeSingle();

    const form = new FormData();
    form.set('apikey', ZOHO_KEY);
    // Actual file content — no URL fetching on Zoho's side.
    form.append('document', fileBlob, fileName);
    form.set(
      'document_info',
      JSON.stringify({
        // Unique per open → each session starts from the current file.
        document_id: `${att.id}-${Date.now()}`,
        document_name: (fileName.replace(/\.[^.]+$/, '') || 'document').slice(0, 100),
      })
    );
    form.set(
      'user_info',
      JSON.stringify({ user_id: callerId, display_name: callerProf?.full_name ?? 'User' })
    );
    form.set('editor_settings', JSON.stringify({ language: lang === 'en' ? 'en' : 'ar' }));
    form.set('permissions', JSON.stringify({ 'document.export': true, 'document.print': true }));
    form.set(
      'callback_settings',
      JSON.stringify({
        save_format: editor.saveFormat,
        save_url: saveUrl,
        http_method_type: 'post',
        retries: 2,
        timeout: 120000,
      })
    );

    const zres = await fetch(`${ZOHO_BASE}${editor.endpoint}`, {
      method: 'POST',
      body: form,
    });
    const ztext = await zres.text();
    let zdata: Record<string, unknown> | null = null;
    try {
      zdata = JSON.parse(ztext);
    } catch {
      zdata = null;
    }
    const editorUrl =
      (zdata?.document_url as string | undefined) ??
      (zdata?.spreadsheet_url as string | undefined) ??
      (zdata?.presentation_url as string | undefined);
    if (!zres.ok || !editorUrl) {
      return json(502, { error: 'Editor session failed', detail: ztext.slice(0, 800) });
    }
    return json(200, { editorUrl });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message ?? e) });
  }
});

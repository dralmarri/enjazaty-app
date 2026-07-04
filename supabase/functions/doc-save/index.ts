/**
 * Edge Function: doc-save
 *
 * Receives the edited document from Zoho Office Integrator's save callback
 * and overwrites the ORIGINAL file in Storage (same path → same attachment,
 * history intact), then bumps the attachment url's ?v= so every client and
 * the CDN pick up the fresh bytes.
 *
 * Must be deployed WITHOUT JWT verification (Zoho calls it, not our app):
 *   npx supabase functions deploy doc-save --no-verify-jwt --project-ref <ref>
 *
 * Authenticated instead by an HMAC token embedded in the save URL that only
 * doc-session (which knows DOC_SAVE_SECRET) can produce.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SAVE_SECRET = Deno.env.get('DOC_SAVE_SECRET') ?? '';
const BUCKET = 'attachments';

const MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  txt: 'text/plain',
  csv: 'text/csv',
};

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

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const attachmentId = u.searchParams.get('attachment') ?? '';
    const token = u.searchParams.get('token') ?? '';
    if (
      !attachmentId ||
      !SAVE_SECRET ||
      token !== (await hmacHex(attachmentId, SAVE_SECRET))
    ) {
      return new Response('forbidden', { status: 403 });
    }

    // Zoho posts multipart form data; the edited file is the only File part
    // (field names vary by editor, so scan rather than hardcode).
    const form = await req.formData();
    let file: File | null = null;
    for (const [, value] of form.entries()) {
      if (value instanceof File) {
        file = value;
        break;
      }
    }
    if (!file) return new Response('no file in callback', { status: 400 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: att } = await admin
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle();
    if (!att) return new Response('attachment not found', { status: 404 });

    // Storage path = everything after ".../object/public/attachments/".
    const clean = (att.url as string).split('?')[0];
    const marker = `/object/public/${BUCKET}/`;
    const idx = clean.indexOf(marker);
    if (idx < 0) return new Response('attachment url is not in storage', { status: 400 });
    const path = decodeURIComponent(clean.slice(idx + marker.length));

    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      upsert: true,
      contentType: MIME[ext] ?? file.type ?? 'application/octet-stream',
    });
    if (upErr) return new Response(`upload failed: ${upErr.message}`, { status: 500 });

    await admin
      .from('attachments')
      .update({ url: `${clean}?v=${Date.now()}`, size: bytes.byteLength })
      .eq('id', attachmentId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String((e as Error)?.message ?? e), { status: 500 });
  }
});

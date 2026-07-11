/**
 * Edge Function: send-contact-email
 *
 * Sends an email notification whenever an employee submits the "Contact us"
 * form, so the message actually lands in an inbox (the contact_messages
 * table alone is silent — nobody sees new rows unless they open Supabase).
 *
 * Uses Resend (https://resend.com) — free tier, no server to run.
 *
 * Secrets required (npx supabase secrets set ...):
 *   RESEND_API_KEY   — API key from https://resend.com/api-keys
 * Optional:
 *   CONTACT_TO_EMAIL — destination inbox (defaults to hr.media.q8@gmail.com)
 *   RESEND_FROM      — from address (defaults to Resend's shared test sender,
 *                       which works with no domain setup)
 *
 * Deploy:  npx supabase functions deploy send-contact-email --project-ref <ref>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const CONTACT_TO_EMAIL = Deno.env.get('CONTACT_TO_EMAIL') ?? 'hr.media.q8@gmail.com';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Enjazaty <onboarding@resend.dev>';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { email, message } = await req.json();
    if (!email || !message) {
      return new Response(JSON.stringify({ error: 'email and message are required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: 'رسالة جديدة من تواصل معنا — إنجازاتي',
        html: `
          <div dir="rtl" style="font-family: sans-serif; font-size: 15px; color:#1F2937;">
            <p><b>البريد الإلكتروني للمرسل:</b> ${escapeHtml(email)}</p>
            <p><b>الرسالة:</b></p>
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `resend failed: ${detail}` }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

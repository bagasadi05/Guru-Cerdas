// Sends at most one queued WhatsApp class report through Fonnte per call, 4–7 minutes apart.
// Called every minute by pg_cron (job 'wa-fonnte-sender') with X-Internal-Secret
// from app_config 'wa_fonnte_sender_secret'. Needs the FONNTE_TOKEN secret; without it
// nothing is claimed, so the queue stays untouched.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendPushNotification, type PushPayload } from '../_shared/web-push.ts';
import {
  interpretFonnteResponse,
  runFonnteSender,
  type FonnteSendResult,
  type OutboxMessage,
} from '../_shared/wa-fonnte.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const fonnteToken = (Deno.env.get('FONNTE_TOKEN') ?? '').trim();
const vapid = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
  subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@portalguru.app',
};
const FONNTE_SEND_URL = 'https://api.fonnte.com/send';
const FONNTE_TIMEOUT_MS = 20_000;

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function safeEqual(a: string, b: string): boolean {
  if (!a.length || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorize(req: Request): Promise<boolean> {
  const secret = req.headers.get('x-internal-secret') ?? '';
  if (secret) {
    const { data, error } = await supabase.rpc('get_app_config', { p_key: 'wa_fonnte_sender_secret' });
    if (error) throw new Error(error.message);
    if (typeof data === 'string' && safeEqual(secret, data)) return true;
  }
  return safeEqual((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''), serviceKey);
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as T;
}

async function sendToFonnte(phone: string, text: string): Promise<FonnteSendResult> {
  const form = new FormData();
  form.set('target', phone);
  form.set('message', text);
  form.set('countryCode', '62');
  // Shows "typing…" before the message, like a person would.
  form.set('typing', 'true');
  // A request that never gets an answer throws; the caller treats that as an unknown outcome.
  const res = await fetch(FONNTE_SEND_URL, {
    method: 'POST',
    headers: { Authorization: fonnteToken },
    body: form,
    signal: AbortSignal.timeout(FONNTE_TIMEOUT_MS),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return interpretFonnteResponse(res.status, body);
}

/** Tells the class's wali kelas, on every device with notifications on, that WhatsApp failed. */
async function notifyWaliKelas(classId: string, reportDate: string): Promise<void> {
  if (!vapid.publicKey || !vapid.privateKey) return;
  const { data: cls, error } = await supabase
    .from('classes').select('name, wali_kelas_id').eq('id', classId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!cls?.wali_kelas_id) return;

  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions').select('id, endpoint, p256dh, auth')
    .eq('user_id', cls.wali_kelas_id).eq('is_active', true).is('student_id', null);
  if (subErr) throw new Error(subErr.message);

  const payload: PushPayload = {
    title: `Laporan ${cls.name} belum terkirim lewat WhatsApp`,
    body: 'Kehadiran, pelanggaran, dan nilai kelas hari ini tetap bisa dilihat di aplikasi Guru Cerdas.',
    tag: `wa-report-fallback-${classId}-${reportDate}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: { url: '/', type: 'wa-report-fallback', classId, reportDate },
  };
  for (const sub of subs ?? []) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, vapid,
    );
    if (result.reason === 'subscription_gone') {
      await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  try {
    if (!url || !serviceKey) return json({ ok: false, error: 'Supabase configuration missing' }, 500);
    if (!await authorize(req)) return json({ ok: false, error: 'Unauthorized' }, 401);
    if (!fonnteToken) return json({ ok: false, error: 'FONNTE_TOKEN is not configured' }, 503);

    const summary = await runFonnteSender({
      lastAttempt: async () => {
        const { data, error } = await supabase
          .from('wa_outbox').select('id, claimed_at, error')
          .not('claimed_at', 'is', null)
          .order('claimed_at', { ascending: false }).limit(5);
        if (error) throw new Error(error.message);
        // Expired reports are closed without sending; they do not count toward the gap.
        const row = (data ?? []).find((r) => !String(r.error ?? '').startsWith('expired:'));
        return row ? { at: new Date(row.claimed_at), key: `${row.id}@${row.claimed_at}` } : null;
      },
      recover: async () => {
        await rpc('worker_recover', { p_lease_minutes: 5, p_max_attempts: 3 });
      },
      claim: async () => {
        const rows = await rpc<OutboxMessage[]>('worker_claim', { p_batch: 1, p_lease_minutes: 5, p_max_attempts: 3 });
        return rows?.[0] ?? null;
      },
      complete: (message, status, waId, error) =>
        rpc<boolean>('worker_complete', {
          p_id: message.id, p_token: message.claim_token, p_status: status, p_wa_id: waId, p_error: error,
        }),
      requeue: (message, error) =>
        rpc<boolean>('worker_requeue', { p_id: message.id, p_token: message.claim_token, p_error: error }),
      send: sendToFonnte,
      notifyWaliKelas,
      now: () => new Date(),
    });
    return json({ ok: true, ...summary });
  } catch (error) {
    console.error('wa-fonnte-sender failed:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: 'Sender failed; check function logs' }, 500);
  }
});

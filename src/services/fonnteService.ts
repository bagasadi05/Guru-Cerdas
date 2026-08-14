/**
 * Fonnte WhatsApp Gateway Service
 *
 * Sends WhatsApp notifications via the serverless proxy at /api/fonnte (Vercel)
 * or via Supabase Edge Function as fallback (local dev).
 * Token stays server-side — never exposed to client direct calls.
 */

import { logger } from './logger';
import { supabase } from './supabase';

const FONNTE_PROXY_URL = '/api/fonnte';

export interface FonnteSendParams {
  target: string;
  message: string;
  token?: string;
}

export async function sendWhatsApp(params: FonnteSendParams): Promise<{ ok: boolean; error?: string }> {
  // 1. Coba lewat proxy /api/fonnte (mode produksi Vercel)
  try {
    const response = await fetch(FONNTE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: params.target, message: params.message }),
    });

    if (response.status !== 404) {
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        let detail = body;
        try {
          const j = JSON.parse(body);
          detail = j.error || j.message || body;
        } catch {
          // ignore plain text error
        }
        logger.warn('Fonnte send failed', 'FonnteService', { status: response.status, detail });
        return { ok: false, error: detail };
      }

      return { ok: true };
    }
  } catch {
    // Network / dev error, lanjut ke Edge Function fallback
  }

  // 2. Fallback via Supabase Edge Function (aman, tidak kena CSP)
  try {
    const { data, error } = await supabase.functions.invoke('fonnte-proxy', {
      body: { action: 'send', target: params.target, message: params.message },
    });

    if (!error && data?.ok !== false) {
      return { ok: true };
    }

    return { ok: false, error: error?.message || data?.error || 'Gagal mengirim via edge function' };
  } catch (err: any) {
    const msg = err?.message || 'Gagal menghubungi server';
    logger.warn('Fonnte edge function fallback failed', 'FonnteService', { error: msg });
    return { ok: false, error: msg };
  }
}

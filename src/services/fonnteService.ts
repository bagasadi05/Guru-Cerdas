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
  // 1. Coba lewat proxy /api/fonnte (mode produksi Vercel).
  //    Semua respons non-2xx (403/404/429/500) atau error jaringan → fallback
  //    ke Edge Function supaya fitur tetap jalan di mana pun aplikasi di-hosting.
  let lastError = '';
  try {
    const response = await fetch(FONNTE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: params.target, message: params.message }),
    });

    const body = await response.text().catch(() => '');
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      // plain text error
    }
    const detail = String(parsed?.error || parsed?.reason || parsed?.message || body || '');

    if (response.ok) {
      // Fonnte mengembalikan status:false saat pesan ditolak gateway → anggap gagal
      if (parsed && parsed.status === false) {
        lastError = detail || 'Pesan ditolak oleh Fonnte';
        logger.warn('Fonnte send rejected by gateway', 'FonnteService', {
          status: response.status,
          detail: lastError,
        });
      } else {
        return { ok: true };
      }
    } else {
      lastError = detail || `HTTP ${response.status}`;
      logger.warn('Fonnte proxy failed, falling back to Edge Function', 'FonnteService', {
        status: response.status,
        detail: lastError,
      });
      // Lanjut ke fallback untuk semua non-2xx
    }
  } catch (err: any) {
    lastError = err?.message || 'Network error';
    // Network / dev error, lanjut ke Edge Function fallback
  }

  // 2. Fallback via Supabase Edge Function (aman, tidak kena CSP)
  try {
    const { data, error } = await supabase.functions.invoke('fonnte-proxy', {
      body: { action: 'send', target: params.target, message: params.message },
    });

    const validData = data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

    if (!error && validData && validData.ok !== false && validData.status !== false) {
      return { ok: true };
    }

    const errMsg =
      error?.message ||
      (validData?.error as string) ||
      (validData?.reason as string) ||
      lastError ||
      'Gagal mengirim via edge function';
    logger.warn('Fonnte edge function fallback failed', 'FonnteService', { error: errMsg });
    return { ok: false, error: errMsg };
  } catch (err: any) {
    const msg = err?.message || 'Gagal menghubungi server';
    logger.warn('Fonnte edge function fallback failed', 'FonnteService', { error: msg });
    return { ok: false, error: msg };
  }
}

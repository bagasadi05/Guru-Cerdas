/**
 * Telegram Bot Service
 *
 * Sends Telegram messages via the serverless proxy at /api/telegram (Vercel)
 * or via Supabase Edge Function as fallback (local dev).
 * Bot token stays server-side — never exposed to client direct calls.
 */

import { logger } from './logger';
import { supabase } from './supabase';

const TELEGRAM_PROXY_URL = '/api/telegram';

export interface TelegramSendParams {
  chatId: string;
  message: string;
}

export async function sendTelegram(params: TelegramSendParams): Promise<{ ok: boolean; error?: string }> {
  // 1. Coba lewat proxy /api/telegram (mode produksi Vercel).
  //    Semua respons non-2xx (403/404/429/500) atau error jaringan → fallback
  //    ke Edge Function supaya fitur tetap jalan di mana pun aplikasi di-hosting.
  let lastError = '';
  try {
    const response = await fetch(TELEGRAM_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: params.chatId, message: params.message }),
    });

    const body = await response.text().catch(() => '');
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      // plain text error
    }
    const detail = String(parsed?.error || parsed?.description || parsed?.reason || parsed?.message || body || '');

    if (response.ok) {
      // Telegram mengembalikan ok:false saat pesan ditolak bot → anggap gagal
      if (parsed && parsed.ok === false) {
        lastError = detail || 'Pesan ditolak oleh Telegram';
        logger.warn('Telegram send rejected by bot', 'TelegramService', {
          status: response.status,
          detail: lastError,
        });
      } else {
        return { ok: true };
      }
    } else {
      lastError = detail || `HTTP ${response.status}`;
      logger.warn('Telegram proxy failed, falling back to Edge Function', 'TelegramService', {
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
    const { data, error } = await supabase.functions.invoke('telegram-proxy', {
      body: { action: 'send', chatId: params.chatId, message: params.message },
    });

    const validData = data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

    if (!error && validData && validData.ok !== false) {
      return { ok: true };
    }

    const errMsg =
      error?.message ||
      (validData?.description as string) ||
      (validData?.error as string) ||
      (validData?.reason as string) ||
      lastError ||
      'Gagal mengirim via edge function';
    logger.warn('Telegram edge function fallback failed', 'TelegramService', { error: errMsg });
    return { ok: false, error: errMsg };
  } catch (err: any) {
    const msg = err?.message || 'Gagal menghubungi server';
    logger.warn('Telegram edge function fallback failed', 'TelegramService', { error: msg });
    return { ok: false, error: msg };
  }
}

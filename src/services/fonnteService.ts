/**
 * Fonnte WhatsApp Gateway Service
 *
 * Sends WhatsApp notifications via the serverless proxy at /api/fonnte.
 * Token stays server-side — never exposed to client.
 */

import { logger } from './logger';

const FONNTE_PROXY_URL = '/api/fonnte';

export interface FonnteSendParams {
  target: string;
  message: string;
}

export async function sendWhatsApp(params: FonnteSendParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(FONNTE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: params.target, message: params.message }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let detail = body;
      try { const j = JSON.parse(body); detail = j.error || j.message || body; } catch {}
      logger.warn('Fonnte send failed', 'FonnteService', { status: response.status, detail });
      return { ok: false, error: detail };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('Fonnte network error', 'FonnteService', { error: msg });
    return { ok: false, error: msg };
  }
}

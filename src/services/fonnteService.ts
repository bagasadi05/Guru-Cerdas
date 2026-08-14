/**
 * Fonnte WhatsApp Gateway Service
 *
 * Sends WhatsApp notifications via the serverless proxy at /api/fonnte
 * with fallback directly to Fonnte API during local development or when token is provided.
 */

import { logger } from './logger';

const FONNTE_PROXY_URL = '/api/fonnte';
const FONNTE_DIRECT_URL = 'https://api.fonnte.com/send';

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
    // Network / dev error, lanjut ke direct fallback
  }

  // 2. Fallback untuk Local Development (Vite dev server) jika token tersedia
  if (params.token) {
    try {
      const formData = new URLSearchParams();
      formData.append('target', params.target);
      formData.append('message', params.message);

      const response = await fetch(FONNTE_DIRECT_URL, {
        method: 'POST',
        headers: {
          Authorization: params.token.trim(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const body = await response.text().catch(() => '');
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(body);
      } catch {
        json = {};
      }

      if (response.ok && json.status === true) {
        return { ok: true };
      }

      const errMsg = String(json.reason || json.message || body || 'Gagal mengirim pesan');
      return { ok: false, error: errMsg };
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghubungi server Fonnte';
      return { ok: false, error: msg };
    }
  }

  return {
    ok: false,
    error: 'Endpoint /api/fonnte tidak tersedia di local dev server. Pastikan Fonnte Token terisi di pengaturan.',
  };
}

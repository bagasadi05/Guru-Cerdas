import { authenticateAdminRequest } from './_auth.js';
import {
  createRateLimiter,
  isOriginAllowed,
  type ExtendedRequest,
  type ExtendedResponse,
} from './_requestGuard.js';

/**
 * Telegram serverless proxy — keeps TELEGRAM_BOT_TOKEN server-side.
 *
 * Mirrors the security model of api/groq.ts:
 *  - Origin allowlist (TELEGRAM_ALLOWED_ORIGIN, comma-separated)
 *  - Per-client rate limiting (in-memory, or Upstash Redis)
 *  - Forward POST to https://api.telegram.org/bot<token>/sendMessage
 *
 * Client contract (see src/services/telegramService.ts):
 *   POST /api/telegram
 *   body: { chatId: string, message: string }
 *   response: Telegram Bot API JSON passthrough
 */

const TELEGRAM_BASE_URL = 'https://api.telegram.org';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_BURST = 5;
const MAX_BODY_BYTES = 10_000;

const checkRateLimit = createRateLimiter({
  prefix: 'rl:telegram',
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  burst: RATE_LIMIT_BURST,
});

function getToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function isBodyValid(body: any): body is { chatId: string; message: string } {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.chatId !== 'string' || body.chatId.length < 1) return false;
  // chatId harus angka, boleh diawali minus (grup Telegram)
  if (!/^-?\d{1,20}$/.test(body.chatId)) return false;
  if (typeof body.message !== 'string' || body.message.length === 0) return false;
  try {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Security 1: Authentication & admin authorization check (matches telegram-proxy Edge Function)
  const auth = await authenticateAdminRequest(req);
  if (!auth.authorized) {
    res.status(auth.statusCode || 401).json({ error: auth.error || 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request: chatId and message required' });
    return;
  }

  const token = getToken();
  if (!token) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
    return;
  }

  if (!isOriginAllowed(req, process.env.TELEGRAM_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const rateLimit = await checkRateLimit(req, auth.userId);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  try {
    let upstream = await fetch(`${TELEGRAM_BASE_URL}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: body.chatId,
        text: body.message,
        parse_mode: 'Markdown',
      }),
    });

    let text = await upstream.text();

    // Fallback: If Telegram returns 400 Bad Request due to unescaped Markdown syntax,
    // retry sending the message without parse_mode (as plain text) to ensure delivery.
    if (!upstream.ok && upstream.status === 400 && text.toLowerCase().includes('parse')) {
      upstream = await fetch(`${TELEGRAM_BASE_URL}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: body.chatId,
          text: body.message,
        }),
      });
      text = await upstream.text();
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      res.send(text);
    }
  } catch {
    res.status(502).json({ error: 'Failed to reach Telegram' });
  }
}

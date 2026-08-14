import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Fonnte serverless proxy — keeps FONNTE_TOKEN server-side.
 *
 * Mirrors the security model of api/groq.ts:
 *  - Origin allowlist (FONNTE_ALLOWED_ORIGIN, comma-separated)
 *  - Per-client rate limiting (in-memory, or Upstash Redis)
 *  - Forward POST to https://api.fonnte.com/send
 *
 * Client contract (see src/services/fonnteService.ts):
 *   POST /api/fonnte
 *   body: { target: string, message: string }
 *   response: Fonnte API JSON passthrough
 */

const FONNTE_BASE_URL = 'https://api.fonnte.com/send';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_BURST = 5;
const MAX_BODY_BYTES = 10_000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

type RateLimitEntry = { count: number; resetAt: number; burstUsed: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

interface ExtendedRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: Record<string, unknown>;
}

interface ExtendedResponse extends ServerResponse {
  status(statusCode: number): ExtendedResponse;
  json(jsonBody: unknown): void;
  send(body: string | Buffer): void;
}

async function getToken(): Promise<string> {
  const envToken = (process.env.FONNTE_TOKEN || '').trim();
  if (envToken) return envToken;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/get_app_config`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_key: 'fonnte_token' }),
      });
      if (resp.ok) {
        const val = await resp.json();
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    } catch {
      // token server tidak tersedia → fallback ke env / error di bawah
    }
  }
  return '';
}

function getRequestOrigin(req: ExtendedRequest): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    try {
      return new URL(referer).origin;
    } catch {
      // referer tidak valid → lanjut ke host header
    }
  }
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] || 'https') as string;
    return `${proto}://${host}`;
  }
  return undefined;
}

function isOriginAllowed(req: ExtendedRequest, allowedOriginEnv: string | undefined): boolean {
  const origin = getRequestOrigin(req);
  if (!origin) return false;

  const reqHost = ((req.headers['x-forwarded-host'] || req.headers.host) as string | undefined)?.toLowerCase();
  if (reqHost) {
    try {
      if (new URL(origin).hostname.toLowerCase() === reqHost) return true;
    } catch {
      // origin tidak valid → lanjut ke pattern matching
    }
  }

  const defaultPatterns = [
    'https://guru-cerdas.my.id',
    'https://*.guru-cerdas.my.id',
    'https://*.vercel.app',
    'http://localhost:*',
    'http://127.0.0.1:*',
  ];

  const configuredPatterns = allowedOriginEnv
    ? allowedOriginEnv.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const allPatterns = [...configuredPatterns, ...defaultPatterns];

  return allPatterns.some((pattern) => {
    if (pattern === origin) return true;
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '[a-zA-Z0-9-.:]+') + '$';
      return new RegExp(regexStr).test(origin);
    }
    try {
      const patternUrl = new URL(pattern);
      const originUrl = new URL(origin);
      if (patternUrl.protocol === originUrl.protocol) {
        const pHost = patternUrl.hostname.toLowerCase();
        const oHost = originUrl.hostname.toLowerCase();
        return oHost === pHost || oHost.endsWith('.' + pHost);
      }
    } catch {
      // pattern/origin tidak valid → anggap tidak cocok
    }
    return false;
  });
}

function getClientKey(req: ExtendedRequest): string {
  const xRealIp = req.headers['x-real-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];
  const remoteAddress =
    typeof xRealIp === 'string'
      ? xRealIp
      : typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : req.socket?.remoteAddress;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : 'unknown';
  return `${remoteAddress || 'unknown'}:${userAgent}`;
}

function allowRequestInMemory(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS, burstUsed: 0 });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.count < RATE_LIMIT_MAX) {
    existing.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.burstUsed < RATE_LIMIT_BURST) {
    existing.burstUsed += 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
}

async function allowRequestRedis(
  key: string,
  redisUrl: string,
  redisToken: string
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    const limit = RATE_LIMIT_MAX + RATE_LIMIT_BURST;
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['TTL', key]]),
    });
    if (!response.ok) throw new Error(`Upstash Redis HTTP error: ${response.status}`);
    const results = await response.json();
    const count = Number(results[0]?.result);
    const ttl = Number(results[1]?.result);
    if (ttl === -1) {
      await fetch(`${redisUrl}/expire/${key}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    }
    if (count > limit) {
      const retryAfterMs = ttl > 0 ? ttl * 1000 : RATE_LIMIT_WINDOW_MS;
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch (err) {
    console.error('Redis Rate Limiter Error (falling back to in-memory):', err);
    return allowRequestInMemory(key);
  }
}

function isBodyValid(body: any): body is { target: string; message: string } {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.target !== 'string' || body.target.length < 8) return false;
  if (typeof body.message !== 'string' || body.message.length === 0) return false;
  try {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse): Promise<void> {
  // Lampirkan CORS headers ke semua response (preflight, error, dan sukses).
  const applyCors = () => {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  };

  // CORS preflight (cross-origin fetch, mis. redirect www → non-www)
  if (req.method === 'OPTIONS') {
    applyCors();
    res.status(204).end();
    return;
  }

  applyCors();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request: target and message required' });
    return;
  }

  const token = await getToken();
  if (!token) {
    res.status(500).json({ error: 'FONNTE_TOKEN is not configured' });
    return;
  }

  if (!isOriginAllowed(req, process.env.FONNTE_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const clientKey = `rl:fonnte:${getClientKey(req)}`;
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  let rateLimit;
  if (redisUrl && redisToken) {
    rateLimit = await allowRequestRedis(clientKey, redisUrl, redisToken);
  } else {
    rateLimit = allowRequestInMemory(clientKey);
  }

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', body.target);
    formData.append('message', body.message);

    const upstream = await fetch(FONNTE_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      res.send(text);
    }
  } catch {
    res.status(502).json({ error: 'Failed to reach Fonnte' });
  }
}

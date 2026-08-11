import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Groq serverless proxy — keeps GROQ_API_KEY server-side.
 *
 * Mirrors the security model of api/gemini.ts:
 *  - Origin allowlist (GROQ_ALLOWED_ORIGIN, comma-separated)
 *  - Per-client rate limiting (in-memory, or Upstash Redis)
 *  - Server-side multi-key round-robin with per-key cooldown after upstream 429s
 *
 * Client contract (see src/services/groqService.ts):
 *   POST /api/groq
 *   body: { model, messages, temperature?, max_tokens?, response_format? }
 *   response: passthrough of Groq's Chat Completions JSON
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_BURST = 10;
const MAX_BODY_BYTES = 500_000;

type RateLimitEntry = { count: number; resetAt: number; burstUsed: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

const keyCooldowns = new Map<string, number>();
let keyIndex = 0;

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

function getKeys(): string[] {
  return (process.env.GROQ_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function pickNextKey(): string | null {
  const keys = getKeys();
  if (keys.length === 0) return null;
  const now = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[keyIndex % keys.length];
    keyIndex = (keyIndex + 1) % keys.length;
    const cooldownUntil = keyCooldowns.get(key) || 0;
    if (cooldownUntil <= now) return key;
  }
  return keys[keyIndex % keys.length];
}

function markKeyCooldown(key: string, ms: number): void {
  keyCooldowns.set(key, Date.now() + Math.min(ms || RATE_LIMIT_WINDOW_MS, RATE_LIMIT_WINDOW_MS));
}

function parseRetryAfterSeconds(header: string | null | undefined): number {
  if (!header) return RATE_LIMIT_WINDOW_MS / 1000;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return RATE_LIMIT_WINDOW_MS / 1000;
}

function getRequestOrigin(req: ExtendedRequest): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    try { return new URL(referer).origin; } catch {}
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
    } catch {}
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
    } catch {}
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

function isModelAllowed(model: unknown): model is string {
  if (typeof model !== 'string') return false;
  return /^(llama|mixtral|gemma)-[a-z0-9._-]+$/i.test(model);
}

function isBodyValid(body: any): body is {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
} {
  if (!body || typeof body !== 'object') return false;
  if (!isModelAllowed(body.model)) return false;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return false;
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

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request body or model not allowed' });
    return;
  }

  if (getKeys().length === 0) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    return;
  }

  if (!isOriginAllowed(req, process.env.GROQ_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const clientKey = `rl:groq:${getClientKey(req)}`;
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

  const apiKey = pickNextKey();
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    return;
  }

  try {
    const upstream = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4096,
        ...(body.response_format ? { response_format: body.response_format } : {}),
      }),
    });

    const text = await upstream.text();
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    if (upstream.status === 429) {
      markKeyCooldown(apiKey, parseRetryAfterSeconds(retryAfter) * 1000);
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Failed to reach Groq' });
  }
}

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Gemini serverless proxy — keeps GEMINI_API_KEY server-side.
 *
 * Mirrors the security model of the former api/openrouter.ts:
 *  - Origin allowlist (GEMINI_ALLOWED_ORIGIN, comma-separated, wildcard + subdomain support)
 *  - Per-client rate limiting (in-memory, or Upstash Redis when KV_REST_API_URL is set)
 *  - Server-side multi-key round-robin with per-key cooldown after upstream 429s
 *  - Upstream Retry-After header passed through so the client waits the full quota window
 *
 * Client contract (see src/services/geminiService.ts):
 *   POST /api/gemini
 *   body: { model: "gemini-2.0-flash", contents: [...], systemInstruction?, generationConfig?, safetySettings? }
 *   response: passthrough of Google's generateContent JSON (candidates, promptFeedback, ...)
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_BURST = 20;
const MAX_BODY_BYTES = 500_000;

type RateLimitEntry = { count: number; resetAt: number; burstUsed: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

// Server-side key pool (comma-separated GEMINI_API_KEY). A key that hit an
// upstream 429 goes into cooldown so rotation skips it until it resets.
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
  return (process.env.GEMINI_API_KEY || '')
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
  // All keys in cooldown — use the next one anyway (client will honor Retry-After).
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

function isOriginAllowed(origin: string | undefined, allowedOrigin: string | undefined): boolean {
  if (!allowedOrigin) return false;
  if (!origin) return false;
  const allowedOrigins = allowedOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return allowedOrigins.some((pattern) => {
    if (pattern === origin) return true;

    // Match wildcards (e.g. https://*.guru-cerdas.my.id)
    if (pattern.includes('*')) {
      const regexStr =
        '^' +
        pattern
          .replace(/\*/g, '__WILDCARD__')
          .replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape regex characters
          .replace(/__WILDCARD__/g, '[a-zA-Z0-9-]+') + // Match alphanumeric and dash subdomains
        '$';
      const regex = new RegExp(regexStr);
      return regex.test(origin);
    }

    // Automatically match subdomains of pattern domain (e.g. www.domain.com matches domain.com)
    try {
      const patternUrl = new URL(pattern);
      const originUrl = new URL(origin);
      if (patternUrl.protocol === originUrl.protocol) {
        const pHost = patternUrl.hostname.toLowerCase();
        const oHost = originUrl.hostname.toLowerCase();
        return oHost === pHost || oHost.endsWith('.' + pHost);
      }
    } catch {
      // Fallback if URL parsing fails
    }

    return false;
  });
}

function getRequestOrigin(req: ExtendedRequest): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getClientKey(req: ExtendedRequest): string {
  // Prevent client spoofing by prioritizing Vercel's secure routing headers
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

    // Use Upstash Redis pipeline to INCR and TTL atomically in a single network request
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['TTL', key],
      ]),
    });

    if (!response.ok) {
      throw new Error(`Upstash Redis HTTP error: ${response.status}`);
    }

    const results = await response.json();
    const count = Number(results[0]?.result);
    const ttl = Number(results[1]?.result);

    // If TTL is -1 (no expiry set), set expiry to RATE_LIMIT_WINDOW_MS
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
    // If Redis fails, gracefully fall back to the in-memory rate limiter so service doesn't go down
    console.error('Redis Rate Limiter Error (falling back to in-memory):', err);
    return allowRequestInMemory(key);
  }
}

function getRequestId(req: ExtendedRequest): string {
  const headerId = req.headers['x-request-id'];
  if (typeof headerId === 'string' && headerId.length > 0) return headerId;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isModelAllowed(model: unknown): model is string {
  if (typeof model !== 'string') return false;
  // Restrict to Gemini models — prevents abusing the proxy as a general relay.
  return /^gemini-[a-z0-9._-]+$/i.test(model);
}

function isBodyValid(body: any): body is {
  model: string;
  contents: { parts: unknown[] }[];
  systemInstruction?: unknown;
  generationConfig?: unknown;
  safetySettings?: unknown;
} {
  if (!body || typeof body !== 'object') return false;
  if (!isModelAllowed(body.model)) return false;
  if (!Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 50) return false;
  for (const item of body.contents) {
    if (!item || typeof item !== 'object') return false;
    if (!Array.isArray((item as { parts?: unknown }).parts) || ((item as { parts: unknown[] }).parts.length === 0)) return false;
  }
  try {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse): Promise<void> {
  const requestId = getRequestId(req);
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request body or model not allowed', requestId });
    return;
  }

  if (getKeys().length === 0) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  const origin = getRequestOrigin(req);
  if (!isOriginAllowed(origin, process.env.GEMINI_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed', requestId });
    return;
  }

  const clientKey = `rl:${getClientKey(req)}`;
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  let rateLimit;
  if (redisUrl && redisToken) {
    rateLimit = await allowRequestRedis(clientKey, redisUrl, redisToken);
  } else {
    rateLimit = allowRequestInMemory(clientKey);
  }

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded', requestId });
    return;
  }

  const apiKey = pickNextKey();
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  // Forward a sanitized payload — never send the model field or anything else
  // the client injected beyond the whitelisted Gemini body keys.
  const payload: Record<string, unknown> = { contents: body.contents };
  if (body.systemInstruction) payload.systemInstruction = body.systemInstruction;
  if (body.generationConfig) payload.generationConfig = body.generationConfig;
  if (body.safetySettings) payload.safetySettings = body.safetySettings;

  try {
    const upstream = await fetch(
      `${GEMINI_BASE_URL}/${body.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const text = await upstream.text();
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    if (upstream.status === 429) {
      markKeyCooldown(apiKey, parseRetryAfterSeconds(retryAfter) * 1000);
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('X-Proxy-Request-Id', requestId);
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Failed to reach Gemini', requestId });
  }
}

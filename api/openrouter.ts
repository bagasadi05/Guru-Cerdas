import type { IncomingMessage, ServerResponse } from 'http';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_BURST = 10;

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

function isOriginAllowed(origin: string | undefined, allowedOrigin: string | undefined): boolean {
  if (!origin) return false;

  // Automatically allow localhost and 127.0.0.1 in development
  const isDev = process.env.NODE_ENV !== 'production' || process.env.VITE_APP_ENV === 'development';
  if (isDev) {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }

  if (!allowedOrigin) return false;
  const allowedOrigins = allowedOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return allowedOrigins.some(pattern => {
    if (pattern === origin) return true;

    // Match wildcards (e.g. https://*.guru-cerdas.my.id)
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern
        .replace(/\*/g, '__WILDCARD__')
        .replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape regex characters
        .replace(/__WILDCARD__/g, '[a-zA-Z0-9-]+') + '$';  // Match alphanumeric and dash subdomains
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

function getClientKey(req: ExtendedRequest): string {
  // Prevent client spoofing by prioritizing Vercel's secure routing headers
  const xRealIp = req.headers['x-real-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];
  const remoteAddress = typeof xRealIp === 'string' ? xRealIp :
                        typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0].trim() :
                        req.socket?.remoteAddress;
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

async function allowRequestRedis(key: string, redisUrl: string, redisToken: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    const limit = RATE_LIMIT_MAX + RATE_LIMIT_BURST;

    // Use Upstash Redis pipeline to INCR and TTL atomically in a single network request
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', key],
        ['TTL', key]
      ])
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
        headers: { Authorization: `Bearer ${redisToken}` }
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

function isModelAllowed(model: string | undefined): boolean {
  if (!model) return false;
  if (model.endsWith(':free')) return true;
  const whitelist = [
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'arcee-ai/trinity-large-preview:free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ];
  return whitelist.includes(model);
}

function isBodyValid(body: any): boolean {
  if (!body || typeof body !== 'object') return false;

  // Validate model
  if (typeof body.model !== 'string' || !isModelAllowed(body.model)) {
    return false;
  }

  // Validate messages
  if (!Array.isArray(body.messages)) return false;
  
  // Reasonable limit of messages
  if (body.messages.length > 50) return false;

  for (const msg of body.messages) {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'system') return false;
    if (typeof msg.content !== 'string') return false;
    
    // Limit message content size to prevent payload attack (max 50KB per message)
    if (msg.content.length > 50000) return false;
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

  // Validate request body
  if (!isBodyValid(req.body)) {
    res.status(400).json({ error: 'Invalid request body or model not allowed', requestId });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
    return;
  }

  let allowedOrigin = process.env.OPENROUTER_ALLOWED_ORIGIN;
  if (!allowedOrigin) {
    const defaultOrigins = ['https://guru-cerdas.my.id', 'https://www.guru-cerdas.my.id'];
    if (process.env.VERCEL_URL) {
      defaultOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      defaultOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    allowedOrigin = defaultOrigins.join(',');
  }
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
  let refererOrigin: string | undefined;
  if (referer) {
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = undefined;
    }
  }
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : refererOrigin;
  if (!isOriginAllowed(origin, allowedOrigin)) {
    res.status(403).json({ 
      error: 'Origin not allowed', 
      detectedOrigin: origin || 'unknown',
      allowedOrigin: allowedOrigin || 'not configured',
      requestId 
    });
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

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const text = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('X-Proxy-Request-Id', requestId);
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Failed to reach OpenRouter', requestId });
  }
}

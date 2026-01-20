const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_BURST = 10;

type RateLimitEntry = { count: number; resetAt: number; burstUsed: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function isOriginAllowed(origin: string | undefined, allowedOrigin: string | undefined): boolean {
  if (!allowedOrigin) return true;
  if (!origin) return false;
  return origin === allowedOrigin;
}

function getClientKey(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function allowRequest(key: string): { allowed: boolean; retryAfterMs: number } {
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

function getRequestId(req: any): string {
  const headerId = req.headers['x-request-id'];
  if (typeof headerId === 'string' && headerId.length > 0) return headerId;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default async function handler(req: any, res: any): Promise<void> {
  const requestId = getRequestId(req);
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
    return;
  }

  const allowedOrigin = process.env.OPENROUTER_ALLOWED_ORIGIN;
  const origin = req.headers.origin || req.headers.referer;
  if (!isOriginAllowed(origin, allowedOrigin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const clientKey = getClientKey(req);
  const rateLimit = allowRequest(clientKey);
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
  } catch (error) {
    res.status(502).json({ error: 'Failed to reach OpenRouter', requestId });
  }
}

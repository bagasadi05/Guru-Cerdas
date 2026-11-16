import type { IncomingMessage, ServerResponse } from 'http';

export interface ExtendedRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface ExtendedResponse extends ServerResponse {
  status(statusCode: number): ExtendedResponse;
  json(jsonBody: unknown): void;
  send(body: string | Buffer): void;
}

export interface RateLimitConfig {
  prefix: string;
  windowMs: number;
  max: number;
  burst: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

type RateLimitEntry = { count: number; resetAt: number; burstUsed: number };

const DEFAULT_ORIGIN_PATTERNS = [
  'https://guru-cerdas.my.id',
  'https://*.guru-cerdas.my.id',
  'http://localhost:*',
  'http://127.0.0.1:*',
];

/**
 * Beyond this size the in-memory store is pruned of expired entries before a
 * new one is written, so a flood of unique IPs cannot grow it without bound.
 */
const MAX_RATE_LIMIT_ENTRIES = 5_000;

function extractExplicitOrigin(req: ExtendedRequest): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore malformed Referer header */
    }
  }
  return undefined;
}

function matchesAllowlist(origin: string, allowedOriginEnv: string | undefined): boolean {
  const configuredPatterns = allowedOriginEnv
    ? allowedOriginEnv.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  const allPatterns = [...configuredPatterns, ...DEFAULT_ORIGIN_PATTERNS];

  return allPatterns.some((pattern) => {
    if (pattern === origin) return true;
    if (pattern.includes('*')) {
      const regexStr =
        '^' +
        pattern
          .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
          .replace(/\*/g, '[a-zA-Z0-9-.:]+') +
        '$';
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
      /* ignore malformed URL or pattern */
    }
    return false;
  });
}

/**
 * Verifies that the request comes from an allowed browser origin or same-host allowlist.
 * When both Origin and Referer are omitted, falls back to host allowlist matching
 * instead of auto-trusting an arbitrary Host header.
 */
export function isOriginAllowed(req: ExtendedRequest, allowedOriginEnv: string | undefined): boolean {
  const explicitOrigin = extractExplicitOrigin(req);
  const reqHost = ((req.headers['x-forwarded-host'] || req.headers.host) as string | undefined)?.toLowerCase();

  if (explicitOrigin) {
    if (reqHost) {
      try {
        const parsed = new URL(explicitOrigin);
        const originHost = parsed.host.toLowerCase();
        const originHostname = parsed.hostname.toLowerCase();
        const reqHostname = reqHost.split(':')[0];
        if (originHost === reqHost || originHostname === reqHostname) {
          return true;
        }
      } catch {
        /* ignore malformed URL */
      }
    }
    return matchesAllowlist(explicitOrigin, allowedOriginEnv);
  }

  if (!reqHost) return false;
  const proto = ((req.headers['x-forwarded-proto'] || 'https') as string).toLowerCase();
  return matchesAllowlist(`${proto}://${reqHost}`, allowedOriginEnv);
}

export function getClientKey(req: ExtendedRequest): string {
  const xRealIp = req.headers['x-real-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];
  const remoteAddress =
    typeof xRealIp === 'string'
      ? xRealIp
      : typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : req.socket?.remoteAddress;
  // Deliberately IP-only: a User-Agent in the key lets one caller mint unlimited
  // buckets by rotating the header.
  return remoteAddress || 'unknown';
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  function pruneExpired(now: number): void {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  function allowInMemory(key: string): RateLimitResult {
    const now = Date.now();
    if (store.size >= MAX_RATE_LIMIT_ENTRIES) pruneExpired(now);
    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + config.windowMs, burstUsed: 0 });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (existing.count < config.max) {
      existing.count += 1;
      return { allowed: true, retryAfterMs: 0 };
    }
    if (existing.burstUsed < config.burst) {
      existing.burstUsed += 1;
      return { allowed: true, retryAfterMs: 0 };
    }
    return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  async function allowRedis(key: string, redisUrl: string, redisToken: string): Promise<RateLimitResult> {
    try {
      const windowSeconds = Math.ceil(config.windowMs / 1000);
      const limit = config.max + config.burst;
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['TTL', key]]),
      });
      if (!response.ok) {
        throw new Error(`Upstash Redis HTTP error: ${response.status}`);
      }
      const results = await response.json();
      const count = Number(results[0]?.result);
      const ttl = Number(results[1]?.result);
      if (ttl === -1) {
        await fetch(`${redisUrl}/expire/${key}/${windowSeconds}`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
      }
      if (count > limit) {
        const retryAfterMs = ttl > 0 ? ttl * 1000 : config.windowMs;
        return { allowed: false, retryAfterMs };
      }
      return { allowed: true, retryAfterMs: 0 };
    } catch (err) {
      console.error('Redis Rate Limiter Error (falling back to in-memory):', err);
      return allowInMemory(key);
    }
  }

  /**
   * Authenticated callers are limited per user id; anonymous ones per IP. Keying
   * on the identity the JWT proves means a new IP cannot reset the budget.
   */
  return async function checkRateLimit(req: ExtendedRequest, subjectId?: string): Promise<RateLimitResult> {
    const subject = subjectId?.trim();
    const clientKey = subject
      ? `${config.prefix}:u:${subject}`
      : `${config.prefix}:ip:${getClientKey(req)}`;
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
      return allowRedis(clientKey, redisUrl, redisToken);
    }
    return allowInMemory(clientKey);
  };
}

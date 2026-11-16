import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, getClientKey, isOriginAllowed } from '../../api/_requestGuard';
import type { ExtendedRequest } from '../../api/_requestGuard';

function createMockReq(headers: Record<string, string> = {}, socketAddress?: string): ExtendedRequest {
  return {
    method: 'POST',
    headers: {
      host: 'guru-cerdas.my.id',
      ...headers,
    },
    socket: socketAddress ? { remoteAddress: socketAddress } : undefined,
    query: {},
    cookies: {},
  } as unknown as ExtendedRequest;
}

describe('api/_requestGuard — isOriginAllowed', () => {
  it('allows a request whose origin matches the request host', () => {
    const req = createMockReq({ origin: 'https://guru-cerdas.my.id' });
    expect(isOriginAllowed(req, undefined)).toBe(true);
  });

  it('allows an origin listed in the per-endpoint env', () => {
    const req = createMockReq({ origin: 'https://sekolah.example.id' });
    expect(isOriginAllowed(req, 'https://sekolah.example.id')).toBe(true);
  });

  it('matches wildcard patterns declared in the env allowlist', () => {
    const req = createMockReq({ origin: 'https://app.sekolah.sch.id' });
    expect(isOriginAllowed(req, 'https://*.sekolah.sch.id')).toBe(true);
  });

  it('rejects an unrelated vercel.app deployment', () => {
    const req = createMockReq({ origin: 'https://evil-clone.vercel.app' });
    expect(isOriginAllowed(req, undefined)).toBe(false);
  });

  it('falls back to the forwarded host when origin and referer are absent', () => {
    const req = createMockReq({
      'x-forwarded-host': 'guru-cerdas.my.id',
      'x-forwarded-proto': 'https',
    });
    expect(isOriginAllowed(req, undefined)).toBe(true);
  });

  it('rejects a host outside the allowlist when no origin is sent', () => {
    const req = createMockReq({ host: 'attacker.example.com' });
    expect(isOriginAllowed(req, undefined)).toBe(false);
  });

  it('rejects a malformed origin header', () => {
    const req = createMockReq({ origin: 'not-a-url' });
    expect(isOriginAllowed(req, undefined)).toBe(false);
  });
});

describe('api/_requestGuard — getClientKey', () => {
  it('ignores the user agent so the bucket key cannot be rotated', () => {
    const first = getClientKey(createMockReq({ 'x-forwarded-for': '203.0.113.9', 'user-agent': 'curl/8' }));
    const second = getClientKey(createMockReq({ 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Mozilla/5.0' }));

    expect(first).toBe('203.0.113.9');
    expect(second).toBe(first);
  });

  it('prefers x-real-ip and falls back to the socket address', () => {
    expect(getClientKey(createMockReq({ 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '203.0.113.9' }))).toBe(
      '198.51.100.1'
    );
    expect(getClientKey(createMockReq({}, '127.0.0.1'))).toBe('127.0.0.1');
  });
});

describe('api/_requestGuard — createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('allows max plus burst calls, then blocks with a retry hint', async () => {
    const check = createRateLimiter({ prefix: 'test', windowMs: 60_000, max: 2, burst: 1 });
    const req = createMockReq({ 'x-forwarded-for': '203.0.113.20' });

    expect((await check(req)).allowed).toBe(true);
    expect((await check(req)).allowed).toBe(true);
    expect((await check(req)).allowed).toBe(true);

    const blocked = await check(req);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the budget once the window elapses', async () => {
    const check = createRateLimiter({ prefix: 'test-window', windowMs: 60_000, max: 1, burst: 0 });
    const req = createMockReq({ 'x-forwarded-for': '203.0.113.10' });

    expect((await check(req)).allowed).toBe(true);
    expect((await check(req)).allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'));
    expect((await check(req)).allowed).toBe(true);
  });

  it('keeps a separate budget per authenticated user', async () => {
    const check = createRateLimiter({ prefix: 'test-user', windowMs: 60_000, max: 1, burst: 0 });
    const req = createMockReq({ 'x-forwarded-for': '203.0.113.11' });

    expect((await check(req, 'user-a')).allowed).toBe(true);
    expect((await check(req, 'user-a')).allowed).toBe(false);
    expect((await check(req, 'user-b')).allowed).toBe(true);
  });

  it('falls back to the in-memory store when redis is unreachable', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://redis.example.upstash.io');
    vi.stubEnv('KV_REST_API_TOKEN', 'token');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const check = createRateLimiter({ prefix: 'test-redis', windowMs: 60_000, max: 1, burst: 0 });
    const req = createMockReq({ 'x-forwarded-for': '203.0.113.12' });

    expect((await check(req)).allowed).toBe(true);
    expect((await check(req)).allowed).toBe(false);
  });
});

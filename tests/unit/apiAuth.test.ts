import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateRequest } from '../../api/_auth';
import type { IncomingMessage } from 'http';

function createMockReq(headers: Record<string, string> = {}, method = 'POST'): IncomingMessage {
  return {
    method,
    headers: {
      host: 'example.com',
      ...headers,
    },
  } as unknown as IncomingMessage;
}

describe('api/_auth — authenticateRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('allows OPTIONS preflight requests without authentication', async () => {
    const req = createMockReq({}, 'OPTIONS');
    const result = await authenticateRequest(req);
    expect(result.authorized).toBe(true);
  });

  it('rejects requests missing Authorization header in production', async () => {
    const req = createMockReq({});
    const result = await authenticateRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toContain('Missing Authorization header');
  });

  it('bypasses in local dev if allowDevWithoutAuth is true', async () => {
    const req = createMockReq({ host: 'localhost:3000' });
    const result = await authenticateRequest(req);
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe('dev-bypass-local');
  });

  it('successfully validates token with Supabase auth endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user-uuid-123', email: 'teacher@school.id' }),
    } as Response);

    const req = createMockReq({ authorization: 'Bearer valid-jwt-token' });
    const result = await authenticateRequest(req);

    expect(result.authorized).toBe(true);
    expect(result.userId).toBe('user-uuid-123');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://test-project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer valid-jwt-token',
          apikey: 'test-anon-key',
        },
      })
    );
  });

  it('rejects invalid or expired session tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    const req = createMockReq({ authorization: 'Bearer expired-jwt-token' });
    const result = await authenticateRequest(req);

    expect(result.authorized).toBe(false);
    expect(result.error).toContain('Invalid or expired session token');
  });
});

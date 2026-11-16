import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateAdminRequest, authenticateRequest } from '../../api/_auth';
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

  it('bypasses in local dev only when the caller opts in', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const req = createMockReq({ host: 'localhost:3000' });
    const result = await authenticateRequest(req, { allowDevWithoutAuth: true });
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe('dev-bypass-local');
  });

  it('does not bypass in development when the caller does not opt in', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const result = await authenticateRequest(createMockReq({ host: 'localhost:3000' }));
    expect(result.authorized).toBe(false);
  });

  it('does not trust a spoofed localhost host header in production', async () => {
    const spoofed: Record<string, string>[] = [{ host: 'localhost:3000' }, { 'x-forwarded-host': '127.0.0.1' }];
    for (const headers of spoofed) {
      const result = await authenticateRequest(createMockReq(headers));
      expect(result.authorized).toBe(false);
    }
  });

  it('bypasses under vercel dev only when the caller opts in', async () => {
    vi.stubEnv('VERCEL_ENV', 'development');
    const result = await authenticateRequest(createMockReq({}), { allowDevWithoutAuth: true });
    expect(result.authorized).toBe(true);
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

describe('api/_auth — authenticateAdminRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects non-admin authenticated users with 403', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'teacher-123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => false,
      } as Response);

    const req = createMockReq({ authorization: 'Bearer teacher-jwt' });
    const result = await authenticateAdminRequest(req);

    expect(result.authorized).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  it('allows admin users verified via is_admin_user RPC', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'admin-123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => true,
      } as Response);

    const req = createMockReq({ authorization: 'Bearer admin-jwt' });
    const result = await authenticateAdminRequest(req);

    expect(result.authorized).toBe(true);
    expect(result.userId).toBe('admin-123');
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://test-project.supabase.co/rest/v1/rpc/is_admin_user',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_user_id: 'admin-123' }),
      })
    );
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('../useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  clearStaleAuthTokens: vi.fn(),
}));

describe('useAuth', () => {
  it('loads auth state', async () => {
    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current).toBeDefined();
  });
});

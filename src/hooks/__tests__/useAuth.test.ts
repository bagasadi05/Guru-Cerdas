import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('useAuth', () => {
  it('loads auth state', async () => {
    const { useAuth } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useAuth());
    expect(result.current).toBeDefined();
  });
});

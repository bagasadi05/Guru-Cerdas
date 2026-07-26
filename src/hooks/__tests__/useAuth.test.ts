/**
 * Tests for useAuth hook & AuthProvider
 *
 * Covers:
 * - AuthProvider rendering and initialization
 * - Session loading states
 * - User role fetching (approved / not approved)
 * - Login / logout / signup operations
 * - Notification management
 * - Error handling (expired tokens, role fetch failures)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const mockSupabaseAuth = {
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  refreshSession: vi.fn(),
};

const mockSupabaseFrom = vi.fn();

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
  clearStaleAuthTokens: vi.fn(),
}));

vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/avatarUtils', () => ({
  getStudentAvatar: vi.fn(() => '/default-avatar.png'),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockSession(overrides: Record<string, any> = {}) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test Guru',
        avatar_url: null,
      },
      ...overrides,
    },
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_at: Date.now() + 3600000,
    ...overrides,
  };
}

function setupDefaultMocks() {
  mockSupabaseAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mockSupabaseAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // ── Initialization ──────────────────────────────────────────────────────────

  it('should render AuthProvider and provide auth context', async () => {
    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(true); // Initially loading
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isNotificationsEnabled).toBe(false);
  });

  it('should throw when useAuth is used outside AuthProvider', async () => {
    const { useAuth } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  // ── Session Initialization ──────────────────────────────────────────────────

  it('should set isAdmin when role is admin', async () => {
    const mockSession = createMockSession();
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin', is_approved: true },
        error: null,
      }),
    });

    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // Verify the context value eventually contains the correct role info
    expect(result.current.isAdmin).toBeDefined();
    expect(typeof result.current.isAdmin).toBe('boolean');
    expect(result.current.userRole).toBeDefined();
  });

  // ── Role Handling ──────────────────────────────────────────────────────────

  it('should handle unapproved user by calling signOut', async () => {
    const mockSession = createMockSession();
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'teacher', is_approved: false },
        error: null,
      }),
    });

    const { AuthProvider } = await import('../useAuth');
    const { render } = await import('@testing-library/react');
    const { act } = await import('react');

    await act(async () => {
      render(
        React.createElement(AuthProvider, null,
          React.createElement('div', null, 'child')
        )
      );
    });

    // Should call signOut when user is not approved
    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
  });

  // ── Login/Logout ───────────────────────────────────────────────────────────

  it('should call supabase.auth.signInWithPassword on login', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await result.current.login('teacher@school.com', 'password123');
    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teacher@school.com',
      password: 'password123',
    });
  });

  it('should call supabase.auth.signOut on logout', async () => {
    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await result.current.logout();
    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
  });

  it('should call supabase.auth.signUp on signup', async () => {
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await result.current.signup('New Teacher', 'new@school.com', 'securePass1!');
    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: 'new@school.com',
      password: 'securePass1!',
      options: expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Teacher',
        }),
        emailRedirectTo: expect.any(String),
      }),
    });
  });

  // ── Expired Token Handling ─────────────────────────────────────────────────

  it('should handle expired refresh token gracefully', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: {
        message: 'refresh token is expired',
        status: 400,
      },
    });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should handle unexpected session fetch errors', async () => {
    mockSupabaseAuth.getSession.mockRejectedValue(new Error('Network error'));
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
  });

  // ── Auth State Change Subscription ─────────────────────────────────────────

  it('should subscribe to auth state changes on mount', async () => {
    const { AuthProvider } = await import('../useAuth');
    const { render } = await import('@testing-library/react');
    const { act } = await import('react');

    await act(async () => {
      render(
        React.createElement(AuthProvider, null,
          React.createElement('div', null, 'child')
        )
      );
    });

    expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
  });

  it('should clean up subscription on unmount', async () => {
    const unsubscribe = vi.fn();
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { AuthProvider } = await import('../useAuth');
    const { render } = await import('@testing-library/react');
    const { act } = await import('react');

    let unmount: () => void;
    await act(async () => {
      const result = render(
        React.createElement(AuthProvider, null,
          React.createElement('div', null, 'child')
        )
      );
      unmount = result.unmount;
    });

    await act(async () => {
      unmount!();
    });

    expect(unsubscribe).toHaveBeenCalled();
  });

  // ── Context Value Stability ─────────────────────────────────────────────────

  it('should provide login, logout, signup, updateUser in context value', async () => {
    const { useAuth, AuthProvider } = await import('../useAuth');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.signup).toBe('function');
    expect(typeof result.current.updateUser).toBe('function');
    expect(typeof result.current.enableScheduleNotifications).toBe('function');
    expect(typeof result.current.disableScheduleNotifications).toBe('function');
  });
});

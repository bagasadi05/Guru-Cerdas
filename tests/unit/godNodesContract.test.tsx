import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useAuth, AuthContext } from '../../src/hooks/useAuth';
import { useToast, ToastProvider } from '../../src/hooks/useToast';
import { Button } from '../../src/components/ui/Button';
import { supabase } from '../../src/services/supabase';

describe('God Nodes Contract Verification', () => {
  describe('useAuth Contract', () => {
    it('exports useAuth hook and AuthContext', () => {
      expect(typeof useAuth).toBe('function');
      expect(AuthContext).toBeDefined();
    });

    it('provides expected contract shape when rendered within AuthContext', () => {
      const mockAuthValue = {
        session: null,
        user: null,
        userRole: 'teacher',
        isAdmin: false,
        loading: false,
        isNotificationsEnabled: false,
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
        signup: vi.fn(),
        enableScheduleNotifications: vi.fn(),
        disableScheduleNotifications: vi.fn(),
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={mockAuthValue as any}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Core authentication state keys required by 140+ dependent components
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('userRole');
      expect(result.current).toHaveProperty('isAdmin');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('updateUser');
      expect(result.current).toHaveProperty('signup');
    });
  });

  describe('useToast Contract', () => {
    it('exports useToast hook', () => {
      expect(typeof useToast).toBe('function');
    });

    it('provides toast notification methods required by 130+ dependent components', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      let hookResult: any;
      React.act(() => {
        const { result } = renderHook(() => useToast(), { wrapper });
        hookResult = result;
      });

      expect(typeof hookResult.current.success).toBe('function');
      expect(typeof hookResult.current.error).toBe('function');
      expect(typeof hookResult.current.info).toBe('function');
      expect(typeof hookResult.current.warning).toBe('function');
    });
  });

  describe('Button Component Contract', () => {
    it('exports a forwardRef React button component', () => {
      expect(Button).toBeDefined();
      expect(typeof Button).toBe('object'); // React.forwardRef returns an object
    });
  });

  describe('supabase Client Contract', () => {
    it('exports standard Supabase client methods required by data services', () => {
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.rpc).toBe('function');
      expect(typeof supabase.channel).toBe('function');
      expect(supabase.auth).toBeDefined();
    });
  });
});

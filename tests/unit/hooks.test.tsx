import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthContext } from '../../src/hooks/useAuth';
import { ToastProvider, useToast } from '../../src/hooks/useToast';

// Mock Supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
        }
    }
}));

describe('useToast Hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
    );

    it('should provide toast functions', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        expect(result.current.success).toBeDefined();
        expect(result.current.error).toBeDefined();
        expect(result.current.warning).toBeDefined();
        expect(result.current.info).toBeDefined();
    });

    it('success function should be callable', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => {
            expect(() => result.current.success('Test message')).not.toThrow();
        });
    });

    it('error function should be callable', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => {
            expect(() => result.current.error('Error message')).not.toThrow();
        });
    });

    it('warning function should be callable', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => {
            expect(() => result.current.warning('Warning message')).not.toThrow();
        });
    });

    it('info function should be callable', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => {
            expect(() => result.current.info('Info message')).not.toThrow();
        });
    });
});

describe('AuthContext', () => {
    it('should provide auth context values', () => {
        const mockAuthValue = {
            user: null,
            session: null,
            loading: false,
            login: vi.fn(),
            signup: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
            enableScheduleNotifications: vi.fn(),
            disableScheduleNotifications: vi.fn(),
            isNotificationsEnabled: false
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthContext.Provider value={mockAuthValue}>
                {children}
            </AuthContext.Provider>
        );

        const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

        expect(result.current?.user).toBeNull();
        expect(result.current?.loading).toBe(false);
        expect(result.current?.login).toBeDefined();
        expect(result.current?.logout).toBeDefined();
    });

    it('should handle user state', () => {
        const mockUser = { id: 'test-123', email: 'test@example.com' };
        const mockAuthValue = {
            user: mockUser as any,
            session: {} as any,
            loading: false,
            login: vi.fn(),
            signup: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
            enableScheduleNotifications: vi.fn(),
            disableScheduleNotifications: vi.fn(),
            isNotificationsEnabled: false
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthContext.Provider value={mockAuthValue}>
                {children}
            </AuthContext.Provider>
        );

        const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

        expect(result.current?.user?.id).toBe('test-123');
        expect(result.current?.user?.email).toBe('test@example.com');
    });
});

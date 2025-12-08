import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Supabase before importing hooks
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: { session: null },
                error: null
            })),
            onAuthStateChange: vi.fn((callback) => {
                // Simulate no session on start
                setTimeout(() => callback('SIGNED_OUT', null), 0);
                return {
                    data: {
                        subscription: {
                            unsubscribe: vi.fn()
                        }
                    }
                };
            }),
            signInWithPassword: vi.fn(() => Promise.resolve({
                data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} },
                error: null
            })),
            signUp: vi.fn(() => Promise.resolve({
                data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} },
                error: null
            })),
            signOut: vi.fn(() => Promise.resolve({ error: null })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
        }))
    }
}));

import { AuthProvider, useAuth, AuthContext } from '../../src/hooks/useAuth';

describe('useAuth Hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('provides user state', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            }, { timeout: 3000 });

            expect(result.current.user).toBeDefined();
        });

        it('provides session state', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            }, { timeout: 3000 });

            expect(result.current.session).toBeDefined();
        });

        it('provides loading state', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(typeof result.current.loading).toBe('boolean');
        });
    });

    describe('Auth Methods', () => {
        it('provides login function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.login).toBeInstanceOf(Function);
        });

        it('provides signup function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.signup).toBeInstanceOf(Function);
        });

        it('provides logout function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.logout).toBeInstanceOf(Function);
        });

        it('provides updateUser function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.updateUser).toBeInstanceOf(Function);
        });
    });

    describe('Notification Methods', () => {
        it('provides enableScheduleNotifications function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.enableScheduleNotifications).toBeInstanceOf(Function);
        });

        it('provides disableScheduleNotifications function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.disableScheduleNotifications).toBeInstanceOf(Function);
        });

        it('provides isNotificationsEnabled state', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(typeof result.current.isNotificationsEnabled).toBe('boolean');
        });
    });
});

describe('AuthContext Direct', () => {
    it('provides context value', () => {
        const mockValue = {
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
            <AuthContext.Provider value={mockValue}>
                {children}
            </AuthContext.Provider>
        );

        const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

        expect(result.current?.login).toBe(mockValue.login);
        expect(result.current?.logout).toBe(mockValue.logout);
    });

    it('handles authenticated user', () => {
        const mockUser = {
            id: 'test-123',
            email: 'teacher@school.com',
            name: 'Test Teacher'
        };

        const mockValue = {
            user: mockUser as any,
            session: { user: mockUser } as any,
            loading: false,
            login: vi.fn(),
            signup: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
            enableScheduleNotifications: vi.fn(),
            disableScheduleNotifications: vi.fn(),
            isNotificationsEnabled: true
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthContext.Provider value={mockValue}>
                {children}
            </AuthContext.Provider>
        );

        const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

        expect(result.current?.user?.id).toBe('test-123');
        expect(result.current?.user?.email).toBe('teacher@school.com');
        expect(result.current?.isNotificationsEnabled).toBe(true);
    });
});

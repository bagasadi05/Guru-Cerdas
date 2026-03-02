import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/hooks/useAuth';
import { ToastProvider } from '../src/hooks/useToast';
import { SemesterProvider } from '../src/contexts/SemesterContext';
import { vi } from 'vitest';

// Mock supabase to prevent errors in SemesterProvider
vi.mock('../src/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                eq: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
            })),
        })),
    },
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

export function renderWithProviders(ui: React.ReactElement, { user = { id: 'test-user', email: 'test@example.com' } } = {}) {
    const queryClient = createTestQueryClient();

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={{
                user: user as any,
                session: {} as any,
                logout: async () => { },
                loading: false,
                login: vi.fn(),
                signup: vi.fn(),
                updateUser: vi.fn(),
                enableScheduleNotifications: vi.fn(),
                disableScheduleNotifications: vi.fn(),
                isNotificationsEnabled: false
            }}>
                <ToastProvider>
                    <SemesterProvider>
                        <MemoryRouter>
                            {ui}
                        </MemoryRouter>
                    </SemesterProvider>
                </ToastProvider>
            </AuthContext.Provider>
        </QueryClientProvider>
    );
}

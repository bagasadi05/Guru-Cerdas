import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/hooks/useAuth';
import { ToastProvider } from '../src/hooks/useToast';
import { SemesterProvider } from '../src/contexts/SemesterContext';
import { I18nProvider } from '../src/utils/i18n';
import { vi } from 'vitest';

// Mock supabase to prevent errors in SemesterProvider
vi.mock('../src/services/supabase', () => {
    const createSelectBuilder = () => {
        const builder: any = {
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            is: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            then: (onfulfilled?: any, onrejected?: any) =>
                Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected),
        };
        return builder;
    };

    return {
        supabase: {
            from: vi.fn(() => ({
                select: vi.fn(() => createSelectBuilder()),
            })),
        },
    };
});

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
            <I18nProvider>
                <AuthContext.Provider value={{
                    user: user as any,
                    session: {} as any,
                    userRole: null,
                    isAdmin: false,
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
            </I18nProvider>
        </QueryClientProvider>
    );
}

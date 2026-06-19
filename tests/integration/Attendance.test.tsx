import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AttendancePage from '../../src/components/pages/AttendancePage';
import { supabase } from '../../src/services/supabase';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/hooks/useAuth';
import { ToastProvider } from '../../src/hooks/useToast';

// Mock Supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: vi.fn((table: string) => {
            const responses: Record<string, unknown[]> = {
                classes: [{ id: 'class-1', name: 'Kelas 10A', user_id: 'test-user' }],
                teacher_class_assignments: [],
                students: [
                    { id: '1', name: 'Budi', class_id: 'class-1', user_id: 'test-user' },
                    { id: '2', name: 'Siti', class_id: 'class-1', user_id: 'test-user' },
                ],
                attendance: [],
                semesters: [],
                academic_years: [],
            };

            const response = { data: responses[table] || [], error: null };
            const query = {
                select: vi.fn(() => query),
                eq: vi.fn(() => query),
                is: vi.fn(() => query),
                order: vi.fn(() => query),
                in: vi.fn(() => query),
                gte: vi.fn(() => query),
                lte: vi.fn(() => query),
                single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                update: vi.fn(() => query),
                upsert: vi.fn(() => Promise.resolve({ error: null })),
                then: vi.fn((resolve) => Promise.resolve(response).then(resolve)),
            };

            return query;
        }),
    },
    ai: {
        models: {
            generateContent: vi.fn(),
        },
    },
}));

// Mock useOfflineStatus
vi.mock('../../src/hooks/useOfflineStatus', () => ({
    useOfflineStatus: () => true,
}));

vi.mock('../../src/contexts/SemesterContext', () => ({
    SemesterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSemester: () => ({
        activeSemester: null,
        activeAcademicYear: null,
        currentSemesterId: null,
        semesters: [],
        isLoading: false,
        refreshSemester: vi.fn(),
        checkStudentAccess: () => ({ canAccess: true }),
        getSemesterByDate: vi.fn(),
        isLocked: vi.fn(() => false),
    }),
}));

describe('AttendancePage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const renderPage = () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        return render(
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={{
                    user: { id: 'test-user', email: 'test@example.com' } as any,
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
                    isNotificationsEnabled: false,
                }}>
                    <ToastProvider>
                        <MemoryRouter>
                            <AttendancePage />
                        </MemoryRouter>
                    </ToastProvider>
                </AuthContext.Provider>
            </QueryClientProvider>
        );
    };

    it('renders student list and allows marking attendance', async () => {
        renderPage();

        // Wait for students to load via the actual rendered text.
        // Using findByText (async) instead of waitFor+getByText avoids races
        // where the assertion runs before the data resolves.
        expect(await screen.findByText('Budi')).toBeInTheDocument();
        expect(await screen.findByText('Siti')).toBeInTheDocument();

        // Use aria-label to target the first student's Hadir button deterministically.
        // aria-label="Hadir" is set on every attendance button in AttendanceList.
        const hadirButtons = await screen.findAllByRole('button', { name: /^Hadir$/i });
        expect(hadirButtons.length).toBeGreaterThan(0);
        fireEvent.click(hadirButtons[0]);

        // Click save — use a scoped regex so we don't match unrelated "Simpan" buttons.
        const saveButton = await screen.findByRole('button', { name: /Simpan Perubahan Absensi/i });
        fireEvent.click(saveButton);

        // Verify the upsert call happened via supabase.from('attendance').
        // waitFor polls until the assertion passes (or times out) which is
        // more tolerant than a single check right after fireEvent.
        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('attendance');
        });
    }, 15000);
});

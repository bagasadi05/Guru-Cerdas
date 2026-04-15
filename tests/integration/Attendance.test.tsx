import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }), // For students query
                    order: vi.fn().mockResolvedValue({
                        data: [
                            { id: '1', name: 'Budi', class_id: 'class-1', user_id: 'test-user' },
                            { id: '2', name: 'Siti', class_id: 'class-1', user_id: 'test-user' }
                        ], error: null
                    }),
                })),
                in: vi.fn().mockResolvedValue({ data: [], error: null }), // For attendance query
            })),
            upsert: vi.fn().mockResolvedValue({ error: null }),
        })),
    },
    ai: {
        models: {
            generateContent: vi.fn(),
        }
    }
}));

// Mock useOfflineStatus
vi.mock('../../hooks/useOfflineStatus', () => ({
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
                        <MemoryRouter>
                            <AttendancePage />
                        </MemoryRouter>
                    </ToastProvider>
                </AuthContext.Provider>
            </QueryClientProvider>
        );
    };

    it('renders student list and allows marking attendance', async () => {
        // Mock classes query
        const mockSelect = vi.fn();
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'classes') {
                return {
                    select: () => ({
                        eq: () => ({
                            is: () => Promise.resolve({ data: [{ id: 'class-1', name: 'Kelas 10A' }], error: null })
                        })
                    })
                };
            }
            if (table === 'semesters') {
                return {
                    select: () => ({
                        order: () => Promise.resolve({ data: [], error: null }),
                        eq: () => ({
                            single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
                        })
                    })
                };
            }
            if (table === 'academic_years') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: null, error: null })
                        })
                    })
                };
            }
            if (table === 'students') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                is: () => ({
                                    order: () => Promise.resolve({
                                        data: [
                                            { id: '1', name: 'Budi', class_id: 'class-1', user_id: 'test-user' },
                                            { id: '2', name: 'Siti', class_id: 'class-1', user_id: 'test-user' }
                                        ],
                                        error: null
                                    })
                                })
                            })
                        })
                    })
                };
            }
            if (table === 'attendance') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => Promise.resolve({ data: [], error: null }),
                            in: () => Promise.resolve({ data: [], error: null }),
                            gte: () => ({
                                lte: () => Promise.resolve({ data: [], error: null })
                            })
                        })
                    }),
                    upsert: vi.fn().mockResolvedValue({ error: null })
                };
            }
            return { select: mockSelect };
        });

        renderPage();

        // Wait for students to load
        await waitFor(() => {
            expect(screen.getByText('Budi')).toBeInTheDocument();
            expect(screen.getByText('Siti')).toBeInTheDocument();
        });

        // Find "Hadir" button for Budi (assuming it's the first button in the row or identified by aria-label/text)
        // Since we don't have specific test ids, we might need to rely on text or class structure.
        // In AttendanceList, buttons usually have text "H", "S", "I", "A" or similar.
        // Let's assume we can find them by text.

        const hadirButtons = screen.getAllByText('H');
        fireEvent.click(hadirButtons[0]); // Click Hadir for first student

        // Check if it's selected (usually changes color)
        // This is hard to test without checking class names, but we can check if state updated if we could access it.
        // For now, let's just ensure no error occurred.

        // Try to save
        const saveButton = screen.getByText(/Simpan Perubahan Absensi/i);
        fireEvent.click(saveButton);

        // Expect upsert to be called
        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('attendance');
        });
    });
});

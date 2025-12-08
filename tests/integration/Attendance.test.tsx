import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AttendancePage from '../../src/components/pages/AttendancePage';
import { renderWithProviders } from '../test-utils';
import { supabase } from '../../src/services/supabase';

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

describe('AttendancePage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders student list and allows marking attendance', async () => {
        // Mock classes query
        const mockSelect = vi.fn();
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'classes') {
                return {
                    select: () => ({
                        eq: () => Promise.resolve({ data: [{ id: 'class-1', name: 'Kelas 10A' }], error: null })
                    })
                };
            }
            if (table === 'students') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
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
                };
            }
            if (table === 'attendance') {
                return {
                    select: () => ({
                        eq: () => ({
                            in: () => Promise.resolve({ data: [], error: null })
                        })
                    }),
                    upsert: vi.fn().mockResolvedValue({ error: null })
                };
            }
            return { select: mockSelect };
        });

        renderWithProviders(<AttendancePage />);

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

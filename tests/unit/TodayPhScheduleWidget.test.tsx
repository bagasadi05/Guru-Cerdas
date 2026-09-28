import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodayPhScheduleWidget, type TodayPhScheduleClassItem } from '../../src/components/dashboard/TodayPhScheduleWidget';
import { formatLocalDate } from '../../src/hooks/dashboard/dashboardHelpers';
import type { PhScheduleRow } from '../../src/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-123', email: 'guru@sekolah.sch.id' },
    }),
}));

vi.mock('../../src/contexts/SemesterContext', () => ({
    useSemester: () => ({
        activeSemester: { id: 'sem-1', name: 'Semester Ganjil' },
    }),
}));

let mockQueryResult: { data: PhScheduleRow[]; error: Error | null } = {
    data: [],
    error: null,
};

vi.mock('../../src/services/supabase', () => {
    return {
        supabase: {
            from: vi.fn((table: string) => {
                if (table === 'ph_schedules') {
                    const chain: Record<string, unknown> = {};
                    chain.select = vi.fn().mockReturnValue(chain);
                    chain.is = vi.fn().mockReturnValue(chain);
                    chain.gte = vi.fn().mockReturnValue(chain);
                    chain.lte = vi.fn().mockReturnValue(chain);
                    chain.order = vi.fn().mockReturnValue(chain);
                    chain.eq = vi.fn().mockReturnValue(chain);
                    chain.then = (onfulfilled: (res: typeof mockQueryResult) => unknown) =>
                        Promise.resolve(mockQueryResult).then(onfulfilled);
                    return chain;
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        },
    };
});

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

const renderWidget = (classes: TodayPhScheduleClassItem[] = []) => {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <TodayPhScheduleWidget classes={classes} />
        </QueryClientProvider>
    );
};

describe('TodayPhScheduleWidget Component', () => {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    const mockClasses: TodayPhScheduleClassItem[] = [
        { id: 'c1', name: 'Kelas 7A' },
        { id: 'c2', name: 'Kelas 8B' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockQueryResult = { data: [], error: null };
    });

    it('renders empty state correctly when there are no scheduled assessments', async () => {
        mockQueryResult = { data: [], error: null };

        renderWidget(mockClasses);

        await waitFor(() => {
            expect(screen.getByText('Agenda Penilaian Harian (PH)')).toBeInTheDocument();
        });

        expect(screen.getByText('Tidak Ada Jadwal PH Terdekat')).toBeInTheDocument();
        expect(
            screen.getByText(/Tidak ada agenda Penilaian Harian dalam 7 hari ke depan/i)
        ).toBeInTheDocument();

        // Check action buttons in empty state
        const createBtn = screen.getByRole('button', { name: /\+ Buat Jadwal PH Baru/i });
        expect(createBtn).toBeInTheDocument();
        fireEvent.click(createBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/jadwal?tab=ph&action=add');

        const viewAllBtn = screen.getByRole('button', { name: /Lihat Jadwal Lengkap/i });
        fireEvent.click(viewAllBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/jadwal?tab=ph');
    });

    it('renders today and upcoming schedules with normalized subjects and class names', async () => {
        const mockSchedules: PhScheduleRow[] = [
            {
                id: 'ph-today-1',
                class_id: 'c1',
                semester_id: 'sem-1',
                subject: 'Ass. Bhs Arab (Mufradat Bab 1)',
                date: todayStr,
                period_label: '1-2',
                created_by: 'test-user-123',
                created_at: '2026-09-01T00:00:00Z',
                updated_at: '2026-09-01T00:00:00Z',
                deleted_at: null,
            },
            {
                id: 'ph-upcoming-1',
                class_id: 'c2',
                semester_id: 'sem-1',
                subject: 'BHS INDONESIA (Teks Laporan Hasil Observasi)',
                date: tomorrowStr,
                period_label: '3-4',
                created_by: 'test-user-123',
                created_at: '2026-09-01T00:00:00Z',
                updated_at: '2026-09-01T00:00:00Z',
                deleted_at: null,
            },
        ];

        mockQueryResult = { data: mockSchedules, error: null };

        renderWidget(mockClasses);

        // Header agenda badge
        await waitFor(() => {
            expect(screen.getByText('2 Agenda')).toBeInTheDocument();
        });

        // Today section checks
        expect(screen.getByText(/Hari Ini \(1 Ujian\)/i)).toBeInTheDocument();
        // Normalized subject 'Ass. Bhs Arab' -> 'Bahasa Arab'
        expect(screen.getByText('Bahasa Arab')).toBeInTheDocument();
        expect(screen.getByText(/Mufradat Bab 1/)).toBeInTheDocument();
        expect(screen.getByText('Kelas 7A')).toBeInTheDocument();

        // Upcoming section checks
        expect(screen.getByText(/Mendatang \(1 Ujian Pekan Ini\)/i)).toBeInTheDocument();
        expect(screen.getByText('Besok')).toBeInTheDocument();
        // Normalized subject 'BHS INDONESIA' -> 'Bahasa Indonesia'
        expect(screen.getByText('Bahasa Indonesia')).toBeInTheDocument();
        expect(screen.getByText('Teks Laporan Hasil Observasi')).toBeInTheDocument();
        expect(screen.getByText('Kelas 8B')).toBeInTheDocument();

        // Clicking a card navigates to full PH schedule page
        const todayCard = screen.getByText('Bahasa Arab').closest('.cursor-pointer');
        expect(todayCard).not.toBeNull();
        fireEvent.click(todayCard!);
        expect(mockNavigate).toHaveBeenCalledWith('/jadwal?tab=ph');
    });
});

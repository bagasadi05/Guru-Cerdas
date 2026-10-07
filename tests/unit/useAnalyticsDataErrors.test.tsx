import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ failTable: null as string | null }));

vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: (table: string) => {
            const chain = {
                select: () => chain, eq: () => chain, is: () => chain, in: () => chain, or: () => chain,
                gte: () => chain, lte: () => chain, order: () => chain, range: () => chain,
                then: (resolve: (value: unknown) => void) => {
                    if (table === db.failTable) return resolve({ data: null, error: { message: 'offline' } });
                    const data = table === 'classes' ? [{ id: 'c1', name: '4A' }]
                        : table === 'students' ? [{ id: 's1', name: 'Ani', class_id: 'c1', gender: 'Perempuan' }]
                        : [];
                    resolve({ data, error: null });
                },
            };
            return chain;
        },
    },
}));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'teacher' }, userRole: 'guru' }) }));
vi.mock('../../src/hooks/useUserSettings', () => ({ useUserSettings: () => ({ kkm: 80 }) }));
vi.mock('../../src/contexts/SemesterContext', () => ({ useSemester: () => ({ activeSemester: { id: 'sem-1', name: 'Ganjil' } }) }));
vi.mock('../../src/services/attendanceAutoFillService', () => ({
    attendanceAutoFillService: { getMissingWeekdaysForClass: async () => [] },
}));

import { useAnalyticsData } from '../../src/components/pages/analytics/useAnalyticsData';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe('useAnalyticsData errors', () => {
    beforeEach(() => { db.failTable = null; });

    it('reports a failed read instead of showing empty analytics, and recovers on retry', async () => {
        db.failTable = 'attendance';
        const { result } = renderHook(() => useAnalyticsData({ dateRange: '2026-08', selectedClassId: 'all' }), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.hasData).toBe(false);

        db.failTable = null;
        await act(async () => { await result.current.refetch(); });
        await waitFor(() => expect(result.current.isError).toBe(false));
        expect(result.current.students).toHaveLength(1);
    });

    it('exposes the teacher KKM as the KKTP used for grading', async () => {
        const { result } = renderHook(() => useAnalyticsData({ dateRange: '2026-08', selectedClassId: 'all' }), { wrapper });
        await waitFor(() => expect(result.current.hasData).toBe(true));
        expect(result.current.kktp).toBe(80);
    });
});

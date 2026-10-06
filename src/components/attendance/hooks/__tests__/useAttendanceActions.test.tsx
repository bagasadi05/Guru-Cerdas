import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceStatus } from '../../../../types';

const mockUpsert = vi.fn();
const mockAddToQueue = vi.fn();

vi.mock('../../../../services/supabase', () => ({
    supabase: { from: vi.fn(() => ({ upsert: (...args: unknown[]) => mockUpsert(...args) })) },
    wasLastResponseQueued: () => false,
}));
vi.mock('../../../../services/offlineQueue', () => ({ addToQueue: (...args: unknown[]) => mockAddToQueue(...args) }));
vi.mock('../../../../utils/confetti', () => ({ triggerPerfectAttendanceConfetti: vi.fn(), triggerSubtleConfetti: vi.fn() }));

import { useAttendanceActions, isSundayDate } from '../useAttendanceActions';

const STUDENTS = [
    { id: 'stu-1', name: 'Ahmad' },
    { id: 'stu-2', name: 'Budi' },
] as never[];

function setup(overrides: { selectedDate?: string; isOnline?: boolean; records?: Record<string, { id?: string; status: AttendanceStatus; note: string }> } = {}) {
    const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const records = overrides.records ?? {
        'stu-1': { id: 'existing-id', status: AttendanceStatus.Hadir, note: '' },
        'stu-2': { status: AttendanceStatus.Sakit, note: 'demam' },
    };

    const { result } = renderHook(() => useAttendanceActions({
        user: { id: 'teacher-1' } as never,
        selectedClass: 'class-1',
        selectedDate: overrides.selectedDate ?? '2026-10-05',
        students: STUDENTS,
        attendanceRecords: records as never,
        setAttendanceRecords: vi.fn(),
        selectedStudents: new Set(),
        setSelectedStudents: vi.fn(),
        noteText: '',
        setNoteText: vi.fn(),
        setIsNoteModalOpen: vi.fn(),
        unmarkedStudents: [],
        isOnline: overrides.isOnline ?? true,
        localDirtyRef: { current: false },
        initialSyncRef: { current: false },
        toast: toast as never,
        getSemesterByDate: () => ({ id: 'sem-1' }) as never,
        selectedSemesterId: null,
        activeSemester: null,
        setIsResetModalOpen: vi.fn(),
        setIsSaveConfirmOpen: vi.fn(),
        setIsDirty: vi.fn(),
    }), { wrapper });

    return { result, toast };
}

describe('isSundayDate', () => {
    it('detects Sundays from a calendar date string', () => {
        expect(isSundayDate('2026-10-04')).toBe(true);
        expect(isSundayDate('2026-10-05')).toBe(false);
        expect(isSundayDate('2026-10-03')).toBe(false);
    });
});

describe('useAttendanceActions save', () => {
    beforeEach(() => {
        mockUpsert.mockReset().mockResolvedValue({ error: null });
        mockAddToQueue.mockReset().mockResolvedValue(undefined);
    });

    it('upserts on (student_id, date) without ids so reset or concurrently saved rows are updated', async () => {
        const { result } = setup();

        act(() => { result.current.handleSave(); });

        await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
        const [rows, options] = mockUpsert.mock.calls[0];
        expect(options).toEqual({ onConflict: 'student_id,date' });
        expect(rows).toHaveLength(2);
        for (const row of rows) {
            expect(row).not.toHaveProperty('id');
            expect(row).toMatchObject({ date: '2026-10-05', deleted_at: null, semester_id: 'sem-1', user_id: 'teacher-1' });
        }
    });

    it('queues offline saves with the same conflict key', async () => {
        const { result } = setup({ isOnline: false });

        act(() => { result.current.handleSave(); });

        await waitFor(() => expect(mockAddToQueue).toHaveBeenCalledTimes(1));
        expect(mockAddToQueue.mock.calls[0][0]).toMatchObject({ table: 'attendance', operation: 'upsert', onConflict: 'student_id,date' });
    });

    it('blocks saving attendance on a Sunday unless every student is marked Libur', () => {
        const { result, toast } = setup({ selectedDate: '2026-10-04' });

        act(() => { result.current.handleSave(); });

        expect(mockUpsert).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Hari Minggu'));
    });

    it('allows an all-Libur Sunday', async () => {
        const { result } = setup({
            selectedDate: '2026-10-04',
            records: {
                'stu-1': { status: AttendanceStatus.Libur, note: '' },
                'stu-2': { status: AttendanceStatus.Libur, note: '' },
            },
        });

        act(() => { result.current.handleSave(); });

        await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
    });
});

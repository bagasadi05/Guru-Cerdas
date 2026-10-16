import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { AttendanceStatus } from '../../../../types';
import { I18nProvider } from '../../../../utils/i18n';

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

function setup(overrides: { selectedDate?: string; isOnline?: boolean; unmarked?: boolean; note?: string; records?: Record<string, { id?: string; status: AttendanceStatus; note: string }> } = {}) {
    const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></I18nProvider>;
    const dirtyRef = { current: true };
    const setDirty = vi.fn();
    const setRecords = vi.fn();
    const setConfirmation = vi.fn();
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
        setAttendanceRecords: setRecords,
        selectedStudents: overrides.note ? new Set(['stu-1']) : new Set(),
        setSelectedStudents: vi.fn(),
        noteText: overrides.note ?? '',
        setNoteText: vi.fn(),
        setIsNoteModalOpen: vi.fn(),
        unmarkedStudents: overrides.unmarked ? [STUDENTS[1]] : [],
        isOnline: overrides.isOnline ?? true,
        localDirtyRef: dirtyRef,
        initialSyncRef: { current: false },
        toast: toast as never,
        getSemesterByDate: () => ({ id: 'sem-1' }) as never,
        selectedSemesterId: null,
        activeSemester: null,
        setIsResetModalOpen: vi.fn(),
        setIsSaveConfirmOpen: setConfirmation,
        setIsDirty: setDirty,
    }), { wrapper });

    return { result, toast, dirtyRef, setDirty, setRecords, setConfirmation, queryClient };
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

    it('executes offline saves even when the query manager detects no network', async () => {
        onlineManager.setOnline(false);
        try {
            const { result } = setup({ isOnline: false });
            await act(async () => { expect(await result.current.handleSave()).toBe('queued'); });
            expect(mockAddToQueue).toHaveBeenCalledWith(expect.objectContaining({ userId: 'teacher-1' }), { requirePersistence: true });
            expect(mockUpsert).not.toHaveBeenCalled();
        } finally {
            onlineManager.setOnline(true);
        }
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

    it.each([true, false])('retains draft and restores cached attendance when save fails (online=%s)', async isOnline => {
        mockUpsert.mockResolvedValue({ error: new Error('server unavailable') });
        mockAddToQueue.mockRejectedValue(new Error('queue unavailable'));
        const { result, dirtyRef, setDirty, queryClient } = setup({ isOnline });
        const key = ['attendanceData', 'teacher-1', 'class-1', '2026-10-05'];
        const persisted = { 'stu-1': { status: AttendanceStatus.Izin, note: 'persisted' } };
        queryClient.setQueryData(key, persisted);
        await act(async () => { expect(await result.current.handleSave()).toBe('failed'); });
        expect(dirtyRef.current).toBe(true);
        expect(setDirty).not.toHaveBeenCalledWith(false);
        expect(queryClient.getQueryData(key)).toEqual(persisted);
    });

    it.each([true, false])('clears dirty only after persistence completes (online=%s)', async isOnline => {
        let finish!: (value: { error: null }) => void;
        const pending = new Promise<{ error: null }>(resolve => { finish = resolve; });
        mockUpsert.mockReturnValue(pending);
        mockAddToQueue.mockReturnValue(pending);
        const { result, dirtyRef, setDirty } = setup({ isOnline });
        let saving!: ReturnType<typeof result.current.handleSave>;
        act(() => { saving = result.current.handleSave(); });
        await waitFor(() => expect(isOnline ? mockUpsert : mockAddToQueue).toHaveBeenCalledTimes(1));
        expect(dirtyRef.current).toBe(true);
        expect(setDirty).not.toHaveBeenCalledWith(false);
        await act(async () => { finish({ error: null }); expect(await saving).toBe(isOnline ? 'saved' : 'queued'); });
        expect(dirtyRef.current).toBe(false);
    });

    it('prevents duplicate saves even before React renders pending state', async () => {
        const { result } = setup();
        await act(async () => {
            const first = result.current.handleSave();
            expect(await result.current.handleSave()).toBe('failed');
            await first;
        });
        expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    it('only changes draft for statuses, templates, remainder and notes', () => {
        const { result, setRecords, toast, setDirty } = setup({ unmarked: true, note: 'Pulang cepat' });
        act(() => { result.current.handleStatusChange('stu-1', AttendanceStatus.Alpha); });
        act(() => { result.current.handleApplyTemplate({ defaultStatus: AttendanceStatus.Libur, applyToAll: true }); });
        act(() => { result.current.markRestAsPresent(); });
        act(() => { result.current.handleSaveNote(); });
        expect(setRecords).toHaveBeenCalledTimes(4);
        expect(setDirty).toHaveBeenCalledWith(true);
        expect(mockUpsert).not.toHaveBeenCalled();
        expect(mockAddToQueue).not.toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Tekan Simpan'));
    });

    it('cancels unmarked confirmation without saving, then permits a later save', async () => {
        const { result, setConfirmation, dirtyRef } = setup({ unmarked: true });
        let pending!: ReturnType<typeof result.current.handleSave>;
        act(() => { pending = result.current.handleSave(); });
        expect(setConfirmation).toHaveBeenCalledWith(true);
        expect(mockUpsert).not.toHaveBeenCalled();
        await act(async () => { result.current.cancelSave(); expect(await pending).toBeNull(); });
        expect(dirtyRef.current).toBe(true);
        act(() => { pending = result.current.handleSave(); });
        await act(async () => { await result.current.confirmSave(); expect(await pending).toBe('saved'); });
        expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
});

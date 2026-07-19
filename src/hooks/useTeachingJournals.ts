import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import journalService from '../services/journalService';
import { queryKeys } from '../lib/queryKeys';
import type {
    TeachingJournalInsert,
    TeachingJournalUpdate,
    TeachingJournalFilters,
} from '../types/teachingJournal';
import { useToast } from './useToast';
import { isTeachingJournalsBackendMissing } from '../utils/journalBackend';

/**
 * Hook to retrieve teaching journals with optional filters.
 * Retries are guarded by the backend-missing check so we don't retry
 * when the table simply hasn't been created yet.
 */
export const useTeachingJournals = (filters: TeachingJournalFilters = {}) => {
    return useQuery({
        queryKey: queryKeys.teachingJournals.list(filters),
        queryFn: () => journalService.getByPeriod(filters),
        retry: (count, error) => !isTeachingJournalsBackendMissing(error) && count < 2,
    });
};

/**
 * Hook to retrieve teaching journals for a specific class.
 */
export const useTeachingJournalsByClass = (classId: string) => {
    return useQuery({
        queryKey: queryKeys.teachingJournals.byClass(classId),
        queryFn: () => journalService.getByClass(classId),
        enabled: !!classId,
        retry: (count, error) => !isTeachingJournalsBackendMissing(error) && count < 2,
    });
};

/**
 * Hook to retrieve teaching journals for a specific date.
 */
export const useTeachingJournalsByDate = (date: string) => {
    return useQuery({
        queryKey: queryKeys.teachingJournals.byDate(date),
        queryFn: () => journalService.getByDate(date),
        enabled: !!date,
        retry: (count, error) => !isTeachingJournalsBackendMissing(error) && count < 2,
    });
};

/**
 * Hook to retrieve the teaching journals rekap (recap/summary).
 */
export const useTeachingJournalsRekap = (filters: TeachingJournalFilters = {}) => {
    return useQuery({
        queryKey: queryKeys.teachingJournals.rekap(filters),
        queryFn: () => journalService.getRekap(filters),
        retry: (count, error) => !isTeachingJournalsBackendMissing(error) && count < 2,
    });
};

/**
 * Hook to create a new teaching journal entry.
 */
export const useCreateJournal = (onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (payload: Omit<TeachingJournalInsert, 'user_id'>) => {
            return journalService.create(payload);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teachingJournals.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
            if (data && (data as any).isOfflineQueued) {
                toast.info('Jurnal disimpan offline. Akan disinkronkan saat kembali online.');
            } else {
                toast.success('Jurnal mengajar berhasil ditambahkan!');
            }
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menambahkan jurnal: ${error.message}`);
        },
    });
};

/**
 * Hook to update an existing teaching journal entry.
 */
export const useUpdateJournal = (onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: TeachingJournalUpdate }) => {
            return journalService.update(id, payload);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teachingJournals.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
            if (data && (data as any).isOfflineQueued) {
                toast.info('Jurnal disimpan offline. Akan disinkronkan saat kembali online.');
            } else {
                toast.success('Jurnal mengajar berhasil diperbarui!');
            }
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal memperbarui jurnal: ${error.message}`);
        },
    });
};

/**
 * Hook to delete a teaching journal entry.
 */
export const useDeleteJournal = (onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => {
            return journalService.remove(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teachingJournals.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
            toast.success('Jurnal mengajar berhasil dihapus!');
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus jurnal: ${error.message}`);
        },
    });
};

import { useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../hooks/useToast';
import {
    restore,
    restoreBulk,
    permanentDelete,
    cleanupExpired,
    SoftDeleteEntity,
    DeletedItem,
    ALL_SOFT_DELETE_ENTITIES,
} from '../../../../services/SoftDeleteService';

interface UseTrashMutationsProps {
    setSelectedItems: (items: Set<string>) => void;
    setConfirmDeleteId: (id: string | null) => void;
    setConfirmBulkDelete: (confirm: boolean) => void;
    setConfirmEmptyTrash: (confirm: boolean) => void;
    setConfirmRestoreAll: (confirm: boolean) => void;
}

// Helper to invalidate all entity queries
function invalidateAllEntityQueries(queryClient: ReturnType<typeof useQueryClient>) {
    for (const entity of ALL_SOFT_DELETE_ENTITIES) {
        queryClient.invalidateQueries({ queryKey: [entity] });
    }
}

export const useTrashMutations = ({
    setSelectedItems,
    setConfirmDeleteId,
    setConfirmBulkDelete,
    setConfirmEmptyTrash,
    setConfirmRestoreAll,
}: UseTrashMutationsProps) => {
    const toast = useToast();
    const queryClient = useQueryClient();

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: async (item: DeletedItem) => {
            const result = await restore(item.entity, item.id);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            invalidateAllEntityQueries(queryClient);
            toast.success('Item berhasil dipulihkan');
        },
        onError: (error) => {
            toast.error(`Gagal memulihkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Restore bulk mutation
    const restoreBulkMutation = useMutation({
        mutationFn: async (items: DeletedItem[]) => {
            const grouped = items.reduce((acc, item) => {
                if (!acc[item.entity]) acc[item.entity] = [];
                acc[item.entity].push(item.id);
                return acc;
            }, {} as Record<SoftDeleteEntity, string[]>);

            for (const [entity, ids] of Object.entries(grouped)) {
                const result = await restoreBulk(entity as SoftDeleteEntity, ids);
                if (!result.success) throw new Error(result.error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            invalidateAllEntityQueries(queryClient);
            setSelectedItems(new Set());
            setConfirmRestoreAll(false);
            toast.success(`${variables.length} item berhasil dipulihkan`);
        },
        onError: (error) => {
            toast.error(`Gagal memulihkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Permanent delete mutation
    const permanentDeleteMutation = useMutation({
        mutationFn: async (item: DeletedItem) => {
            const result = await permanentDelete(item.entity, item.id);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            setConfirmDeleteId(null);
            toast.success('Item dihapus permanen');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Bulk permanent delete mutation with allSettled
    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (items: DeletedItem[]) => {
            const results = await Promise.allSettled(
                items.map(item => permanentDelete(item.entity, item.id))
            );
            const failed = results.filter(r =>
                r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
            );
            return { total: items.length, success: items.length - failed.length, failed: failed.length };
        },
        onSuccess: ({ total, success, failed }) => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            setSelectedItems(new Set());
            setConfirmBulkDelete(false);
            setConfirmEmptyTrash(false);
            if (failed === 0) {
                toast.success(`${success} item dihapus permanen`);
            } else {
                toast.warning(`${success} dari ${total} item berhasil dihapus. ${failed} gagal.`);
            }
        },
        onError: (error) => {
            toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Throttle cleanup logic - runs max once per 24 hours
    useEffect(() => {
        const CLEANUP_KEY = 'trash-last-cleanup';
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const lastCleanup = localStorage.getItem(CLEANUP_KEY);
        const now = Date.now();

        if (lastCleanup && now - Number(lastCleanup) < ONE_DAY) return;

        let cancelled = false;
        const performCleanup = async () => {
            const result = await cleanupExpired();
            if (cancelled) return;
            localStorage.setItem(CLEANUP_KEY, String(now));
            if (result.success && Object.values(result.deletedCounts).some(c => c > 0)) {
                const total = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
                toast.info(`${total} item kadaluarsa (>30 hari) telah dibersihkan otomatis.`);
                queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            }
        };
        performCleanup();

        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        restoreMutation,
        restoreBulkMutation,
        permanentDeleteMutation,
        bulkPermanentDeleteMutation,
    };
};

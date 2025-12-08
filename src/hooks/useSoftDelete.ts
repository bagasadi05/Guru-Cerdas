/**
 * useSoftDelete Hook
 * 
 * Hook for integrating soft delete with undo functionality across all pages.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './useToast';
import { useUndoToastContext } from '../components/ui/UndoToast';
import { softDelete, softDeleteBulk, SoftDeleteEntity } from '../services/SoftDeleteService';
import { recordAction, ActionType } from '../services/UndoManager';
import { useAuth } from './useAuth';

interface UseSoftDeleteOptions {
    entity: SoftDeleteEntity;
    queryKey: string[];
    entityLabel?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

interface DeleteResult {
    success: boolean;
    actionId?: string;
    error?: string;
}

export function useSoftDelete(options: UseSoftDeleteOptions) {
    const { entity, queryKey, entityLabel, onSuccess, onError } = options;
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { showUndoToast } = useUndoToastContext();

    const entityLabels: Record<SoftDeleteEntity, string> = {
        students: 'siswa',
        classes: 'kelas',
        attendance: 'absensi',
        tasks: 'tugas',
    };

    const label = entityLabel || entityLabels[entity];

    // Single delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string): Promise<DeleteResult> => {
            if (!user) throw new Error('User not authenticated');

            // Perform soft delete
            const result = await softDelete(entity, id);
            if (!result.success) {
                throw new Error(result.error);
            }

            // Record action for undo
            const action = await recordAction(
                user.id,
                'delete',
                entity,
                [id],
                undefined,
                `Menghapus 1 ${label}`
            );

            return { success: true, actionId: action.id };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey });

            if (result.actionId) {
                showUndoToast(
                    result.actionId,
                    `1 ${label} dihapus`,
                    'delete',
                    10000,
                    () => {
                        queryClient.invalidateQueries({ queryKey });
                        toast.success(`${label} dipulihkan`);
                    }
                );
            }

            onSuccess?.();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus ${label}: ${error.message}`);
            onError?.(error);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]): Promise<DeleteResult> => {
            if (!user) throw new Error('User not authenticated');
            if (ids.length === 0) throw new Error('No items to delete');

            // Perform bulk soft delete
            const result = await softDeleteBulk(entity, ids);
            if (!result.success) {
                throw new Error(result.error);
            }

            // Record action for undo
            const action = await recordAction(
                user.id,
                'bulk_delete',
                entity,
                ids,
                undefined,
                `Menghapus ${ids.length} ${label}`
            );

            return { success: true, actionId: action.id };
        },
        onSuccess: (result, ids) => {
            queryClient.invalidateQueries({ queryKey });

            if (result.actionId) {
                showUndoToast(
                    result.actionId,
                    `${ids.length} ${label} dihapus`,
                    'delete',
                    10000,
                    () => {
                        queryClient.invalidateQueries({ queryKey });
                        toast.success(`${ids.length} ${label} dipulihkan`);
                    }
                );
            }

            onSuccess?.();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus ${label}: ${error.message}`);
            onError?.(error);
        },
    });

    // Delete function
    const deleteItem = useCallback((id: string) => {
        return deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    // Bulk delete function
    const deleteItems = useCallback((ids: string[]) => {
        return bulkDeleteMutation.mutateAsync(ids);
    }, [bulkDeleteMutation]);

    return {
        deleteItem,
        deleteItems,
        isDeleting: deleteMutation.isPending,
        isBulkDeleting: bulkDeleteMutation.isPending,
    };
}

export default useSoftDelete;

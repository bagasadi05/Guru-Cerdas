import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from './useOfflineStatus';
import { getQueue, removeMutation, processMutation } from '../services/offlineQueue';
import { useToast } from './useToast';
import { logger } from '../services/logger';

/**
 * Custom hook for managing offline data synchronization queue
 * 
 * Manages a queue of database mutations that were made while offline and automatically
 * synchronizes them with the server when the connection is restored.
 * 
 * Features:
 * - Automatically purges corrupted/legacy entries (e.g. table === 'rpc')
 * - Tracks the number of valid pending mutations
 * - Replays mutations using robust processMutation with session renewal & request replay
 * - Invalidates TanStack Query cache after successful sync
 * - Provides non-blocking feedback via toasts
 */
export const useSyncQueue = () => {
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const updatePendingCount = useCallback(async () => {
        try {
            const queue = await getQueue();
            // Automatically purge any corrupted legacy entries (e.g. table === 'rpc' or missing table)
            const corrupted = queue.filter(m => m.table === 'rpc' || !m.table);
            if (corrupted.length > 0) {
                for (const item of corrupted) {
                    await removeMutation(item.id).catch(() => {});
                }
            }

            const validCount = queue.filter(
                m => m.table !== 'rpc' && !!m.table && (m.status === 'pending' || m.status === 'failed')
            ).length;
            setPendingCount(validCount);
        } catch (err) {
            logger.warn('Failed to update pending sync count', 'SyncQueue', err);
        }
    }, []);

    // Initialize pending count
    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    // Listen for changes in localStorage to update count across components/tabs
    useEffect(() => {
        const handleStorageChange = () => {
            updatePendingCount();
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [updatePendingCount]);

    const processQueue = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        const rawQueue = await getQueue();
        // Purge corrupted legacy RPC items
        const corrupted = rawQueue.filter(m => m.table === 'rpc' || !m.table);
        for (const item of corrupted) {
            await removeMutation(item.id).catch(() => {});
        }

        const validQueue = rawQueue.filter(
            m => m.table !== 'rpc' && !!m.table && (m.status === 'pending' || m.status === 'failed')
        );

        if (validQueue.length === 0) {
            setPendingCount(0);
            return;
        }

        setIsSyncing(true);
        toast.info(`Menyinkronkan ${validQueue.length} perubahan offline...`);

        let succeededCount = 0;
        const failedErrors: string[] = [];

        for (const mutation of validQueue) {
            try {
                await processMutation(mutation);
                await removeMutation(mutation.id);
                succeededCount++;
            } catch (error: any) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error(`Sync mutation failed for ${mutation.table}`, undefined, error, 'SyncQueue');
                failedErrors.push(message);
            }
        }

        if (succeededCount > 0) {
            toast.success(`${succeededCount} data offline berhasil disinkronkan!`);
            await queryClient.invalidateQueries();
        }

        if (failedErrors.length > 0 && succeededCount === 0) {
            toast.error(`Gagal sinkronisasi: ${failedErrors[0]}`);
        }

        setIsSyncing(false);
        await updatePendingCount();
    }, [isOnline, isSyncing, queryClient, toast, updatePendingCount]);

    useEffect(() => {
        // When app comes online, process the queue if there are pending items
        if (isOnline && pendingCount > 0) {
            processQueue();
        }
    }, [isOnline, pendingCount, processQueue]);

    return { pendingCount, isSyncing, processQueue };
};

export default useSyncQueue;

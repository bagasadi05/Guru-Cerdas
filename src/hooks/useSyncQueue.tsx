import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from './useOfflineStatus';
import { getQueue, removeMutation, updateMutation, processMutation, isPermanentMutationError } from '../services/offlineQueue';
import { useToast } from './useToast';
import { logger } from '../services/logger';

/**
 * Helper to identify invalid/legacy tables that should never be replayed in offline queue
 */
const isPurgeableTable = (table: string | undefined): boolean => {
    return !table || table === 'rpc' || table === 'audit_logs';
};

/**
 * Custom hook for managing offline data synchronization queue
 * 
 * Manages a queue of database mutations that were made while offline and automatically
 * synchronizes them with the server when the connection is restored.
 * 
 * Features:
 * - Automatically purges corrupted/legacy entries (e.g. table === 'rpc' or 'audit_logs')
 * - Tracks the number of valid pending mutations
 * - Discards permanent 4xx / syntax errors to prevent infinite retry loops
 * - Replays mutations using robust processMutation with session renewal & request replay
 * - Invalidates TanStack Query cache after successful sync
 * - Uses refs to prevent cyclic effect triggers
 */
export const useSyncQueue = () => {
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const isSyncingRef = useRef(false);
    const prevOnlineRef = useRef(isOnline);

    const updatePendingCount = useCallback(async () => {
        try {
            const queue = await getQueue();
            // Automatically purge corrupted or non-sync entries
            const corrupted = queue.filter(m => isPurgeableTable(m.table));
            if (corrupted.length > 0) {
                for (const item of corrupted) {
                    await removeMutation(item.id).catch(() => {});
                }
            }

            const validCount = queue.filter(
                m => !isPurgeableTable(m.table) && (m.status === 'pending' || m.status === 'failed')
            ).length;
            setPendingCount(validCount);
        } catch (err) {
            logger.warn('Failed to update pending sync count', 'SyncQueue', err);
        }
    }, []);

    // Initialize pending count on mount
    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    // Listen for changes in localStorage/storage event to update count across components/tabs
    useEffect(() => {
        const handleStorageChange = () => {
            updatePendingCount();
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [updatePendingCount]);

    const processQueue = useCallback(async () => {
        if (!isOnline || isSyncingRef.current) return;
        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            const rawQueue = await getQueue();
            // Purge corrupted legacy or non-sync items
            const corrupted = rawQueue.filter(m => isPurgeableTable(m.table));
            for (const item of corrupted) {
                await removeMutation(item.id).catch(() => {});
            }

            const validQueue = rawQueue.filter(
                m => !isPurgeableTable(m.table) && (m.status === 'pending' || m.status === 'failed')
            );

            if (validQueue.length === 0) {
                setPendingCount(0);
                return;
            }

            toast.info(`Menyinkronkan ${validQueue.length} perubahan offline...`);

            let succeededCount = 0;
            const failedErrors: string[] = [];

            for (const mutation of validQueue) {
                try {
                    await processMutation(mutation);
                    await removeMutation(mutation.id);
                    succeededCount++;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger.error(`Sync mutation failed for ${mutation.table}`, undefined, error, 'SyncQueue');

                    // Check if error is permanent (e.g. 400 Bad Request, syntax error, UUID mismatch)
                    if (isPermanentMutationError(error)) {
                        logger.warn(`Discarding non-recoverable mutation ${mutation.id} for ${mutation.table}`, 'SyncQueue');
                        await removeMutation(mutation.id).catch(() => {});
                    } else {
                        const newRetryCount = (mutation.retryCount || 0) + 1;
                        if (newRetryCount >= (mutation.maxRetries || 3)) {
                            logger.warn(`Max retries reached for mutation ${mutation.id}, discarding`, 'SyncQueue');
                            await removeMutation(mutation.id).catch(() => {});
                        } else {
                            await updateMutation(mutation.id, {
                                status: 'failed',
                                retryCount: newRetryCount,
                                error: message,
                            }).catch(() => {});
                        }
                    }
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
        } finally {
            setIsSyncing(false);
            isSyncingRef.current = false;
            await updatePendingCount();
        }
    }, [isOnline, queryClient, toast, updatePendingCount]);

    useEffect(() => {
        const wasOffline = !prevOnlineRef.current;
        prevOnlineRef.current = isOnline;

        // Process queue when connection is restored, or upon coming online with pending items
        if (isOnline && (wasOffline || pendingCount > 0) && !isSyncingRef.current) {
            processQueue();
        }
        // Intentionally dependent only on isOnline to prevent infinite re-render loops on sync failures
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    return { pendingCount, isSyncing, processQueue };
};

export default useSyncQueue;

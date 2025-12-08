import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from './useOfflineStatus';
import { supabase } from '../services/supabase';
import { getQueue, clearQueue, QueuedMutation } from '../services/offlineQueue';
import { useToast } from './useToast';

/**
 * Custom hook for managing offline data synchronization queue
 * 
 * Manages a queue of database mutations that were made while offline and automatically
 * synchronizes them with the server when the connection is restored. This enables
 * offline-first functionality where users can continue working without an internet
 * connection, and their changes will be synced when they come back online.
 * 
 * The hook:
 * - Tracks the number of pending mutations in the queue
 * - Automatically processes the queue when the device comes online
 * - Provides manual sync capability via processQueue function
 * - Shows toast notifications for sync status
 * - Invalidates React Query cache after successful sync
 * - Listens to localStorage changes to update count across tabs
 * 
 * @returns Object containing sync queue state and operations
 * @returns pendingCount - Number of mutations waiting to be synced
 * @returns isSyncing - Boolean indicating if sync is currently in progress
 * @returns processQueue - Function to manually trigger queue processing
 * 
 * @example
 * ```typescript
 * import { useSyncQueue } from './hooks/useSyncQueue';
 * 
 * function SyncStatus() {
 *   const { pendingCount, isSyncing, processQueue } = useSyncQueue();
 * 
 *   return (
 *     <div>
 *       {pendingCount > 0 && (
 *         <div>
 *           <p>{pendingCount} changes pending sync</p>
 *           <button onClick={processQueue} disabled={isSyncing}>
 *             {isSyncing ? 'Syncing...' : 'Sync Now'}
 *           </button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Display sync indicator in header
 * function Header() {
 *   const { pendingCount, isSyncing } = useSyncQueue();
 * 
 *   return (
 *     <header>
 *       {isSyncing && <Spinner />}
 *       {pendingCount > 0 && !isSyncing && (
 *         <Badge>{pendingCount} pending</Badge>
 *       )}
 *     </header>
 *   );
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useSyncQueue = () => {
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const [pendingCount, setPendingCount] = useState(getQueue().length);
    const [isSyncing, setIsSyncing] = useState(false);

    const updatePendingCount = useCallback(() => {
        setPendingCount(getQueue().length);
    }, []);

    // Listen for changes in localStorage to update count across components/tabs
    useEffect(() => {
        window.addEventListener('storage', updatePendingCount);
        return () => window.removeEventListener('storage', updatePendingCount);
    }, [updatePendingCount]);

    const processQueue = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        const queue = getQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        toast.info(`Menyinkronkan ${queue.length} perubahan offline...`);

        const promises = queue.map(async (mutation: QueuedMutation) => {
            const { table, operation, payload, onConflict } = mutation;
            let query = supabase.from(table);

            switch (operation) {
                case 'insert':
                    return (query as any).insert(payload);
                case 'update':
                    // Assume payload is an array for multiple updates or an object for single update
                    const updates = Array.isArray(payload) ? payload : [payload];
                    return Promise.all(updates.map(item => (query as any).update(item).eq('id', item.id)));
                case 'upsert':
                    return (query as any).upsert(payload, onConflict ? { onConflict } : {});
                case 'delete':
                    // Assume payload is an object with an id
                    return (query as any).delete().eq('id', payload.id);
                default:
                    console.error(`Unknown operation in queue: ${operation}`);
                    return Promise.reject(new Error(`Unknown operation: ${operation}`));
            }
        });

        try {
            const results = await Promise.all(promises);
            // Flatten results in case of multiple updates in a single operation
            const allResults = results.flat();
            const errors = allResults.filter(res => res && res.error);

            if (errors.length > 0) {
                throw new Error(errors.map(e => e.error?.message).join(', '));
            }

            clearQueue();
            toast.success("Semua data offline berhasil disinkronkan!");
            // Invalidate all queries to refetch fresh data from the server
            await queryClient.invalidateQueries();

        } catch (error: any) {
            toast.error(`Gagal sinkronisasi: ${error.message}`);
            console.error("Sync failed:", error);
        } finally {
            setIsSyncing(false);
            updatePendingCount(); // Should update count to 0
        }
    }, [isOnline, isSyncing, queryClient, toast, updatePendingCount]);

    useEffect(() => {
        // When app comes online, process the queue
        if (isOnline) {
            processQueue();
        }
    }, [isOnline, processQueue]);

    return { pendingCount, isSyncing, processQueue };
};
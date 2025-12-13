import { useState, useEffect, useCallback, useRef } from 'react';
import {
    offlineQueue,
    QueueItem,
    SyncResult,
    cacheData,
    getCachedData,
    invalidateCache,
    registerBackgroundSync,
    resolveConflict,
    detectConflict,
    ConflictResolution
} from '../services/offlineQueueEnhanced';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';

// ============================================
// OFFLINE SYNC HOOK
// ============================================

interface UseOfflineSyncOptions {
    autoSync?: boolean;
    conflictStrategy?: ConflictResolution;
    onConflict?: (itemId: string, local: any, server: any) => Promise<any>;
    onSyncComplete?: (results: SyncResult[]) => void;
    onError?: (error: Error) => void;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
    const {
        autoSync = true,
        conflictStrategy = 'server_wins',
        onConflict,
        onSyncComplete,
        onError
    } = options;

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [conflicts, setConflicts] = useState<{ itemId: string; local: any; server: any }[]>([]);

    const syncInProgressRef = useRef(false);

    // Subscribe to queue changes
    useEffect(() => {
        const unsubscribe = offlineQueue.subscribe(setQueue);
        return unsubscribe;
    }, []);

    // Auto-sync when online
    useEffect(() => {
        if (!autoSync) return;

        const handleOnline = () => {
            logger.info('Connection restored, triggering sync', 'useOfflineSync');
            sync();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [autoSync]);

    // Register background sync
    useEffect(() => {
        registerBackgroundSync();
    }, []);

    // Sync function
    const sync = useCallback(async (): Promise<SyncResult[]> => {
        if (syncInProgressRef.current || !navigator.onLine) {
            return [];
        }

        syncInProgressRef.current = true;
        setIsSyncing(true);
        const results: SyncResult[] = [];

        try {
            await offlineQueue.processQueue(async (item): Promise<SyncResult> => {
                try {
                    const result = await syncItem(item, conflictStrategy, onConflict);
                    results.push(result);

                    if (result.conflict) {
                        setConflicts(prev => [...prev, {
                            itemId: item.id,
                            local: item.data,
                            server: result.serverData
                        }]);
                    }

                    return result;
                } catch (error) {
                    const errorResult: SyncResult = {
                        success: false,
                        item,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                    results.push(errorResult);
                    return errorResult;
                }
            });

            setLastSyncTime(new Date());
            onSyncComplete?.(results);

            return results;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Sync failed');
            onError?.(err);
            logger.error('Sync failed', err);
            return results;
        } finally {
            syncInProgressRef.current = false;
            setIsSyncing(false);
        }
    }, [conflictStrategy, onConflict, onSyncComplete, onError]);

    // Add to queue
    const addToQueue = useCallback(async (
        type: 'CREATE' | 'UPDATE' | 'DELETE',
        table: string,
        data: any,
        priority?: number
    ): Promise<string> => {
        const id = await offlineQueue.add(type, table, data, priority);

        // Invalidate cache for this table
        await invalidateCache(table);

        return id;
    }, []);

    // Resolve conflict manually
    const resolveConflictManually = useCallback(async (
        itemId: string,
        resolution: 'local' | 'server' | 'merge'
    ): Promise<void> => {
        const conflict = conflicts.find(c => c.itemId === itemId);
        if (!conflict) return;

        const strategy: ConflictResolution =
            resolution === 'local' ? 'local_wins' :
                resolution === 'server' ? 'server_wins' : 'merge';

        const resolved = resolveConflict(conflict.local, conflict.server, strategy);

        // Update the queue item with resolved data
        const item = queue.find(i => i.id === itemId);
        if (item) {
            item.data = resolved;
            item.status = 'pending';
            await offlineQueue.processQueue();
        }

        setConflicts(prev => prev.filter(c => c.itemId !== itemId));
    }, [conflicts, queue]);

    // Get pending count
    const pendingCount = queue.filter(i => i.status === 'pending').length;
    const failedCount = queue.filter(i => i.status === 'failed').length;

    return {
        queue,
        isSyncing,
        lastSyncTime,
        conflicts,
        pendingCount,
        failedCount,
        sync,
        addToQueue,
        resolveConflictManually,
        clearQueue: () => offlineQueue.clear(),
        retryFailed: () => offlineQueue.retryFailed()
    };
}

// ============================================
// SYNC ITEM HELPER
// ============================================

async function syncItem(
    item: QueueItem,
    conflictStrategy: ConflictResolution,
    onConflict?: (itemId: string, local: any, server: any) => Promise<any>
): Promise<SyncResult> {
    const { type, table, data } = item;

    // Check for conflicts (for UPDATE operations)
    if (type === 'UPDATE' && data.id) {
        const { data: serverData, error: fetchError } = await (supabase
            .from(table as any) as any)
            .select('*')
            .eq('id', data.id)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch server data: ${fetchError.message}`);
        }

        if (serverData && detectConflict(data, serverData)) {
            if (onConflict) {
                // Let the caller handle the conflict
                const resolved = await onConflict(item.id, data, serverData);
                if (resolved.needsManualResolution) {
                    return {
                        success: false,
                        item,
                        serverData,
                        conflict: true
                    };
                }
                // Use resolved data
                item.data = resolved;
            } else {
                // Auto-resolve using strategy
                item.data = resolveConflict(data, serverData, conflictStrategy);
            }
        }
    }

    // Perform the operation
    let result: any;
    let error: any;

    switch (type) {
        case 'CREATE':
            const { id: _, ...createData } = data;
            ({ data: result, error } = await (supabase
                .from(table as any) as any)
                .insert(createData)
                .select()
                .single());
            break;

        case 'UPDATE':
            const { _localTimestamp, ...updateData } = data;
            ({ data: result, error } = await (supabase
                .from(table as any) as any)
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', data.id)
                .select()
                .single());
            break;

        case 'DELETE':
            ({ error } = await (supabase
                .from(table as any) as any)
                .delete()
                .eq('id', data.id));
            result = { deleted: true };
            break;
    }

    if (error) {
        throw new Error(error.message);
    }

    // Invalidate cache after successful sync
    await invalidateCache(table);

    return {
        success: true,
        item,
        serverData: result
    };
}

// ============================================
// CACHED DATA HOOK
// ============================================

interface UseCachedDataOptions<T> {
    key: string;
    table: string;
    fetchFn: () => Promise<T>;
    ttl?: number;
    enabled?: boolean;
}

export function useCachedData<T>({
    key,
    table,
    fetchFn,
    ttl = 3600000,
    enabled = true
}: UseCachedDataOptions<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isFromCache, setIsFromCache] = useState(false);

    const refresh = useCallback(async (forceRefresh = false): Promise<void> => {
        if (!enabled) return;

        setLoading(true);
        setError(null);

        try {
            // Try cache first if not forcing refresh
            if (!forceRefresh) {
                const cached = await getCachedData<T>(key);
                if (cached) {
                    setData(cached);
                    setIsFromCache(true);
                    setLoading(false);

                    // Refresh in background if online
                    if (navigator.onLine) {
                        fetchFn().then(freshData => {
                            setData(freshData);
                            setIsFromCache(false);
                            cacheData(key, table, freshData, ttl);
                        }).catch(() => {
                            // Keep cached data if refresh fails
                        });
                    }
                    return;
                }
            }

            // Fetch fresh data
            if (navigator.onLine) {
                const freshData = await fetchFn();
                setData(freshData);
                setIsFromCache(false);
                await cacheData(key, table, freshData, ttl);
            } else {
                throw new Error('Tidak ada koneksi internet');
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, [enabled, key, table, fetchFn, ttl]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Refresh when coming online
    useEffect(() => {
        const handleOnline = () => refresh(true);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [refresh]);

    return {
        data,
        loading,
        error,
        isFromCache,
        refresh: () => refresh(true),
        invalidate: () => invalidateCache(table)
    };
}

// ============================================
// ONLINE STATUS HOOK
// ============================================

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (!isOnline) setWasOffline(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOnline]);

    // Reset wasOffline after a delay
    useEffect(() => {
        if (wasOffline) {
            const timer = setTimeout(() => setWasOffline(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [wasOffline]);

    return { isOnline, wasOffline };
}

// ============================================
// OFFLINE-FIRST DATA HOOK
// ============================================

interface UseOfflineFirstOptions<T> {
    table: string;
    fetchFn: () => Promise<T[]>;
    cacheKey?: string;
}

export function useOfflineFirst<T extends { id: string }>({
    table,
    fetchFn,
    cacheKey
}: UseOfflineFirstOptions<T>) {
    const key = cacheKey || `${table}_list`;
    const { addToQueue, sync, pendingCount } = useOfflineSync();

    const {
        data,
        loading,
        error,
        isFromCache,
        refresh,
        invalidate
    } = useCachedData<T[]>({
        key,
        table,
        fetchFn
    });

    const create = useCallback(async (newData: Omit<T, 'id'>): Promise<string> => {
        const tempId = crypto.randomUUID();
        const itemWithId = { ...newData, id: tempId } as T;

        // Optimistic update
        // setData(prev => prev ? [...prev, itemWithId] : [itemWithId]);

        const queueId = await addToQueue('CREATE', table, itemWithId);
        await invalidate();

        return queueId;
    }, [addToQueue, table, invalidate]);

    const update = useCallback(async (id: string, updates: Partial<T>): Promise<string> => {
        const queueId = await addToQueue('UPDATE', table, { id, ...updates });
        await invalidate();
        return queueId;
    }, [addToQueue, table, invalidate]);

    const remove = useCallback(async (id: string): Promise<string> => {
        const queueId = await addToQueue('DELETE', table, { id });
        await invalidate();
        return queueId;
    }, [addToQueue, table, invalidate]);

    return {
        data: data || [],
        loading,
        error,
        isFromCache,
        pendingCount,
        refresh,
        create,
        update,
        remove,
        sync
    };
}

export default useOfflineSync;

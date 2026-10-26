import { supabase } from '../supabase';
import { storageGetJSON, storageSetJSON, storageRemove } from '../../utils/storage';
import { logger } from '../logger';
import { beginSyncBypass, endSyncBypass } from '../syncBypass';
import type { QueuedMutation, SyncProgress } from './types';


const QUEUE_KEY = 'supabase-offline-queue';
const DB_NAME = 'PortalGuruOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

// ============================================

// ============================================
// ORIGINAL FUNCTIONAL INDEXEDDB SETUP
// ============================================

let db: IDBDatabase | null = null;
let syncProgressListeners: ((progress: SyncProgress) => void)[] = [];
let currentSyncProgress: SyncProgress = {
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    status: 'idle'
};

/**
 * Initialize IndexedDB for functional queue
 */
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available in this environment'));
            return;
        }

        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            logger.error('Failed to open IndexedDB, falling back to localStorage');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
};

/**
 * Fallback to storage utility if IndexedDB fails
 */
const getQueueFromStorageUtility = async (): Promise<QueuedMutation[]> => {
    try {
        const queue = await storageGetJSON<QueuedMutation[]>(QUEUE_KEY);
        return queue || [];
    } catch (e) {
        logger.error('Failed to read offline queue from storage utility', undefined, e);
        await storageRemove(QUEUE_KEY);
        return [];
    }
};

const saveQueueToStorageUtility = async (queue: QueuedMutation[]): Promise<void> => {
    await storageSetJSON(QUEUE_KEY, queue);
    window.dispatchEvent(new Event('storage'));
};

// ============================================
// ORIGINAL FUNCTIONAL QUEUE OPERATIONS
// ============================================

/**
 * Retrieves the mutation queue
 *
 * @returns {Promise<QueuedMutation[]>} Current queued mutations sorted by the storage backend.
 */
export const getQueue = async (): Promise<QueuedMutation[]> => {
    try {
        const database = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch {
        // Fallback to storage utility
        return await getQueueFromStorageUtility();
    }
};

/**
 * Adds a new mutation to the offline queue
 *
 * @param {Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'maxRetries' | 'createdAt'>} mutation - Mutation payload to queue for later sync.
 * @returns {Promise<void>} Resolves after the mutation has been persisted.
 */
export const addToQueue = async (mutation: Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'maxRetries' | 'createdAt'>, options?: { requirePersistence?: boolean }): Promise<void> => {
    const newMutation: QueuedMutation = {
        ...mutation,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
    };

    try {
        const database = await initDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newMutation);

            transaction.oncomplete = () => {
                window.dispatchEvent(new Event('storage'));
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
            transaction.onerror = () => reject(transaction.error || new Error('Offline queue transaction failed'));
            transaction.onabort = () => reject(transaction.error || new Error('Offline queue transaction aborted'));
        });
    } catch (error) {
        if (options?.requirePersistence) throw error;
        // Fallback to storage utility
        const queue = await getQueueFromStorageUtility();
        queue.push(newMutation);
        await saveQueueToStorageUtility(queue);
    }
};

/**
 * Updates a mutation in the queue
 *
 * @param {string} id - Queue item identifier.
 * @param {Partial<QueuedMutation>} updates - Partial mutation fields to merge.
 * @returns {Promise<void>} Resolves after the queued mutation is updated.
 */
export const updateMutation = async (id: string, updates: Partial<QueuedMutation>): Promise<void> => {
    try {
        const database = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const mutation = getRequest.result;
                if (mutation) {
                    const updatedMutation = { ...mutation, ...updates };
                    const putRequest = store.put(updatedMutation);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch {
        // Fallback to storage utility
        const queue = await getQueueFromStorageUtility();
        const index = queue.findIndex(m => m.id === id);
        if (index !== -1) {
            queue[index] = { ...queue[index], ...updates };
            await saveQueueToStorageUtility(queue);
        }
    }
};

/**
 * Removes a mutation from the queue
 *
 * @param {string} id - Queue item identifier to remove.
 * @returns {Promise<void>} Resolves after the item is removed.
 */
export const removeMutation = async (id: string): Promise<void> => {
    try {
        const database = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                window.dispatchEvent(new Event('storage'));
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    } catch {
        // Fallback to storage utility
        const queue = await getQueueFromStorageUtility();
        const filteredQueue = queue.filter(m => m.id !== id);
        await saveQueueToStorageUtility(filteredQueue);
    }
};

/**
 * Clears the entire mutation queue
 *
 * @returns {Promise<void>} Resolves after all queued mutations are removed.
 */
export const clearQueue = async (): Promise<void> => {
    try {
        const database = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                window.dispatchEvent(new Event('storage'));
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    } catch {
        await storageRemove(QUEUE_KEY);
        window.dispatchEvent(new Event('storage'));
    }
};

/**
 * Get pending mutations count
 */
export const getPendingCount = async (): Promise<number> => {
    const queue = await getQueue();
    return queue.filter(m => (m.status === 'pending' || m.status === 'failed') && m.table !== 'rpc' && !!m.table).length;
};

/**
 * Get failed mutations
 */
export const getFailedMutations = async (): Promise<QueuedMutation[]> => {
    const queue = await getQueue();
    return queue.filter(m => m.status === 'failed');
};

/**
 * Subscribe to sync progress updates
 *
 * @param {(progress: SyncProgress) => void} callback - Listener called whenever sync progress changes.
 * @returns {() => void} Unsubscribe function that removes the listener.
 */
export const subscribeSyncProgress = (callback: (progress: SyncProgress) => void): () => void => {
    syncProgressListeners.push(callback);
    callback(currentSyncProgress);
    return () => {
        syncProgressListeners = syncProgressListeners.filter(cb => cb !== callback);
    };
};

/**
 * Notify all sync progress listeners
 */
const notifySyncProgress = (progress: SyncProgress) => {
    currentSyncProgress = progress;
    syncProgressListeners.forEach(cb => cb(progress));
};

/**
 * Calculate delay with exponential backoff
 */
const getBackoffDelay = (retryCount: number): number => {
    return Math.min(1000 * Math.pow(2, retryCount), 8000); // Max 8 seconds
};

/**
 * Process a single mutation
 */
export const processMutation = async (mutation: QueuedMutation): Promise<boolean> => {
    const { table, operation, payload, onConflict, request } = mutation;

    beginSyncBypass();
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData.session?.user?.id;
        
        if (!sessionData.session) {
            logger.info('Session is null during replay, keeping item pending', 'OfflineQueue', { id: mutation.id });
            const sessionError = new Error('SESSION_NULL');
            (sessionError as any).code = 'SESSION_NULL';
            throw sessionError;
        }

        // Identity Guard
        if (mutation.userId === null || mutation.userId === undefined) {
            // Legacy item ownership verification
            const queue = await getQueue();
            const otherUserIds = new Set(queue.map(m => m.userId).filter((uid): uid is string => !!uid));
            if (otherUserIds.size > 0 && !otherUserIds.has(currentUserId!)) {
                logger.warn('Ambiguous owners for legacy mutation, keeping pending', 'OfflineQueue', { id: mutation.id });
                const authError = new Error('USER_AMBIGUOUS');
                (authError as any).code = 'USER_AMBIGUOUS';
                throw authError;
            }
        } else if (mutation.userId !== currentUserId) {
            logger.info('Replay user mismatch, keeping item pending', 'OfflineQueue', { 
                id: mutation.id, 
                mutationUserId: mutation.userId, 
                currentUserId 
            });
            const authError = new Error('USER_MISMATCH');
            (authError as any).code = 'USER_MISMATCH';
            throw authError;
        }

        let result;

        if (request) {
            let token = sessionData.session.access_token;

            const executeFetch = async (accessToken: string): Promise<Response> => {
                const headers: Record<string, string> = {
                    ...request.headers,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${accessToken}`
                };
                
                return await fetch(request.url, {
                    method: request.method,
                    headers,
                    body: request.body
                });
            };

            let response = await executeFetch(token!);

            if (response.status === 401) {
                logger.info('Received 401 during replay, attempting session refresh', 'OfflineQueue');
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError || !refreshData.session) {
                    logger.warn('Session refresh failed during replay, keeping item pending', 'OfflineQueue', refreshError);
                    const sessionError = new Error('SESSION_EXPIRED');
                    (sessionError as any).code = 'SESSION_EXPIRED';
                    throw sessionError;
                }
                
                token = refreshData.session.access_token;
                response = await executeFetch(token!);
                
                if (response.status === 401) {
                    logger.error('Received 401 even after session refresh, keeping item pending', 'OfflineQueue');
                    const sessionError = new Error('SESSION_EXPIRED');
                    (sessionError as any).code = 'SESSION_EXPIRED';
                    throw sessionError;
                }
            }

            if (!response.ok) {
                const errText = await response.text();
                // Check if it is an RLS error code in the body or 403 status
                if (response.status === 403 || errText.includes('42501') || errText.includes('permission denied')) {
                    const rlsError = new Error(`RLS_FORBIDDEN: ${errText || 'Access Denied'}`);
                    (rlsError as any).code = '42501';
                    throw rlsError;
                }
                throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
            }

            return true;
        }

        if (table === 'rpc') {
            logger.warn('Purging invalid RPC mutation without request payload', 'OfflineQueue', { id: mutation.id });
            return true;
        }

        switch (operation) {
            case 'insert':
                result = await supabase.from(table).insert(payload as any);
                break;
            case 'update':
                if (payload && !Array.isArray(payload) && payload.id) {
                    result = await supabase.from(table).update(payload as any).match({ id: payload.id });
                } else {
                    const err = new Error('Legacy update mutation lacks valid payload.id');
                    logger.error(err.message, 'OfflineQueue', { mutationId: mutation.id });
                    throw err;
                }
                break;
            case 'upsert':
                if (onConflict) {
                    result = await supabase.from(table).upsert(payload as any, { onConflict });
                } else {
                    result = await supabase.from(table).upsert(payload as any);
                }
                break;
            case 'delete':
                if (payload && !Array.isArray(payload) && payload.id) {
                    result = await supabase.from(table).delete().match({ id: payload.id });
                } else {
                    const err = new Error('Legacy delete mutation lacks valid payload.id');
                    logger.error(err.message, 'OfflineQueue', { mutationId: mutation.id });
                    throw err;
                }
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        if (result.error) {
            throw result.error;
        }

        return true;
    } catch (error) {
        logger.error(`Failed to process mutation ${mutation.id}`, undefined, error);
        throw error;
    } finally {
        endSyncBypass();
    }
};

/**
 * Retry a specific failed mutation
 *
 * @param {string} id - Queue item identifier to retry.
 * @returns {Promise<boolean>} True when the retry succeeds, otherwise false.
 */
export const retryMutation = async (id: string): Promise<boolean> => {
    const queue = await getQueue();
    const mutation = queue.find(m => m.id === id);

    if (!mutation || mutation.status !== 'failed') {
        return false;
    }

    await updateMutation(id, { status: 'processing', lastAttempt: Date.now() });

    try {
        await processMutation(mutation);
        await removeMutation(id);
        return true;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await updateMutation(id, {
            status: 'failed',
            error: errorMessage,
            retryCount: mutation.retryCount + 1
        });
        return false;
    }
};

/**
 * Process all pending mutations with exponential backoff
 *
 * @returns {Promise<SyncProgress>} Final sync progress after processing the queue.
 */
export const processQueue = async (): Promise<SyncProgress> => {
    if (!navigator.onLine) {
        const progress: SyncProgress = {
            total: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            status: 'idle'
        };
        notifySyncProgress(progress);
        return progress;
    }

    const queue = await getQueue();
    // Auto-purge corrupted legacy RPC entries
    const corrupted = queue.filter(m => m.table === 'rpc' || !m.table);
    for (const item of corrupted) {
        await removeMutation(item.id).catch(() => {});
    }
    const cleanQueue = queue.filter(m => m.table !== 'rpc' && !!m.table);
    const pendingMutations = cleanQueue.filter(m => m.status === 'pending' || m.status === 'failed');

    if (pendingMutations.length === 0) {
        const progress: SyncProgress = {
            total: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            status: 'completed'
        };
        notifySyncProgress(progress);
        return progress;
    }

    const progress: SyncProgress = {
        total: pendingMutations.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        status: 'syncing'
    };
    notifySyncProgress(progress);

    for (const mutation of pendingMutations) {
        // Skip if max retries exceeded
        if (mutation.retryCount >= mutation.maxRetries) {
            await updateMutation(mutation.id, { status: 'failed', error: 'Max retries exceeded' });
            progress.processed++;
            progress.failed++;
            notifySyncProgress({ ...progress });
            continue;
        }

        // Apply exponential backoff delay if this is a retry
        if (mutation.retryCount > 0) {
            const delay = getBackoffDelay(mutation.retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        await updateMutation(mutation.id, { status: 'processing', lastAttempt: Date.now() });

        try {
            await processMutation(mutation);
            await removeMutation(mutation.id);
            progress.succeeded++;
        } catch (error: unknown) {
            const errCode = (error as any)?.code;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isSessionIssue = errCode === 'SESSION_NULL' || errCode === 'SESSION_EXPIRED' || errCode === 'USER_MISMATCH' || errCode === 'USER_AMBIGUOUS';

            if (isSessionIssue) {
                logger.warn('Sync halted due to auth session/user issue', 'OfflineQueue', error);
                await updateMutation(mutation.id, { status: 'pending', error: errorMessage });
                progress.failed++;
                notifySyncProgress({ ...progress });
                break;
            }

            const isRLSError = errCode === '42501' || errorMessage.includes('42501') || errorMessage.includes('403') || errorMessage.includes('RLS_FORBIDDEN') || errorMessage.includes('permission denied');
            if (isRLSError) {
                logger.error('RLS Access Denied during replay, marking as failed', 'OfflineQueue', error);
                await updateMutation(mutation.id, {
                    status: 'failed',
                    error: `Akses ditolak: ${errorMessage}`
                });
                progress.failed++;
            } else {
                await updateMutation(mutation.id, {
                    status: 'failed',
                    error: errorMessage,
                    retryCount: mutation.retryCount + 1
                });
                progress.failed++;
            }
        }

        progress.processed++;
        notifySyncProgress({ ...progress });
    }

    progress.status = progress.failed > 0 ? 'error' : 'completed';
    notifySyncProgress(progress);

    return progress;
};

/**
 * Discard a failed mutation
 *
 * @param {string} id - Queue item identifier to discard.
 * @returns {Promise<void>} Resolves after the failed mutation is removed.
 */
export const discardMutation = async (id: string): Promise<void> => {
    await removeMutation(id);
};

/**
 * Discard all failed mutations
 *
 * @returns {Promise<void>} Resolves after every failed mutation is removed.
 */
export const discardAllFailed = async (): Promise<void> => {
    const queue = await getQueue();
    const failedMutations = queue.filter(m => m.status === 'failed');
    await Promise.all(failedMutations.map(m => removeMutation(m.id)));
};

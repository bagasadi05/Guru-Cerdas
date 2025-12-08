/**
 * Enhanced Offline Queue Service
 * 
 * This module provides an advanced queueing system for database mutations when the application
 * is offline. Features include:
 * - Status tracking (pending, processing, failed, success)
 * - Retry counter with exponential backoff (1s, 2s, 4s)
 * - IndexedDB for persistent storage
 * - Sync progress tracking
 * 
 * @module services/offlineQueue
 * @since 2.0.0
 */

import { Database } from "./database.types";
import { supabase } from "./supabase";

const QUEUE_KEY = 'supabase-offline-queue';
const DB_NAME = 'PortalGuruOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

/**
 * Status of a queued mutation
 */
export type MutationStatus = 'pending' | 'processing' | 'failed' | 'success';

/**
 * Represents a database mutation queued for later execution.
 */
export type QueuedMutation = {
    id: string;
    table: keyof Database['public']['Tables'];
    operation: 'upsert' | 'insert' | 'update' | 'delete';
    payload: any;
    onConflict?: string;
    status: MutationStatus;
    retryCount: number;
    maxRetries: number;
    createdAt: number;
    lastAttempt?: number;
    error?: string;
};

/**
 * Sync progress information
 */
export type SyncProgress = {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    status: 'idle' | 'syncing' | 'completed' | 'error';
};

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
 * Initialize IndexedDB
 */
const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB, falling back to localStorage');
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
 * Fallback to localStorage if IndexedDB is not available
 */
const getQueueFromLocalStorage = (): QueuedMutation[] => {
    try {
        const queue = localStorage.getItem(QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    } catch (e) {
        console.error("Failed to read offline queue from localStorage", e);
        localStorage.removeItem(QUEUE_KEY);
        return [];
    }
};

const saveQueueToLocalStorage = (queue: QueuedMutation[]) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('storage'));
};

/**
 * Retrieves the mutation queue
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
    } catch (e) {
        // Fallback to localStorage
        return getQueueFromLocalStorage();
    }
};

/**
 * Adds a new mutation to the offline queue
 */
export const addToQueue = async (mutation: Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'maxRetries' | 'createdAt'>): Promise<void> => {
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
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newMutation);

            request.onsuccess = () => {
                window.dispatchEvent(new Event('storage'));
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (e) {
        // Fallback to localStorage
        const queue = getQueueFromLocalStorage();
        queue.push(newMutation);
        saveQueueToLocalStorage(queue);
    }
};

/**
 * Updates a mutation in the queue
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
    } catch (e) {
        // Fallback to localStorage
        const queue = getQueueFromLocalStorage();
        const index = queue.findIndex(m => m.id === id);
        if (index !== -1) {
            queue[index] = { ...queue[index], ...updates };
            saveQueueToLocalStorage(queue);
        }
    }
};

/**
 * Removes a mutation from the queue
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
    } catch (e) {
        // Fallback to localStorage
        const queue = getQueueFromLocalStorage();
        const filteredQueue = queue.filter(m => m.id !== id);
        saveQueueToLocalStorage(filteredQueue);
    }
};

/**
 * Clears the entire mutation queue
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
    } catch (e) {
        localStorage.removeItem(QUEUE_KEY);
        window.dispatchEvent(new Event('storage'));
    }
};

/**
 * Get pending mutations count
 */
export const getPendingCount = async (): Promise<number> => {
    const queue = await getQueue();
    return queue.filter(m => m.status === 'pending' || m.status === 'failed').length;
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
const processMutation = async (mutation: QueuedMutation): Promise<boolean> => {
    const { table, operation, payload, onConflict } = mutation;

    try {
        let result;

        switch (operation) {
            case 'insert':
                result = await supabase.from(table).insert(payload);
                break;
            case 'update':
                result = await supabase.from(table).update(payload).match({ id: payload.id });
                break;
            case 'upsert':
                result = await supabase.from(table).upsert(payload, onConflict ? { onConflict } : undefined);
                break;
            case 'delete':
                result = await supabase.from(table).delete().match({ id: payload.id });
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        if (result.error) {
            throw result.error;
        }

        return true;
    } catch (error) {
        console.error(`Failed to process mutation ${mutation.id}:`, error);
        throw error;
    }
};

/**
 * Retry a specific failed mutation
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
    } catch (error: any) {
        await updateMutation(id, {
            status: 'failed',
            error: error.message,
            retryCount: mutation.retryCount + 1
        });
        return false;
    }
};

/**
 * Process all pending mutations with exponential backoff
 */
export const processQueue = async (): Promise<SyncProgress> => {
    const queue = await getQueue();
    const pendingMutations = queue.filter(m => m.status === 'pending' || m.status === 'failed');

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
        } catch (error: any) {
            await updateMutation(mutation.id, {
                status: 'failed',
                error: error.message,
                retryCount: mutation.retryCount + 1
            });
            progress.failed++;
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
 */
export const discardMutation = async (id: string): Promise<void> => {
    await removeMutation(id);
};

/**
 * Discard all failed mutations
 */
export const discardAllFailed = async (): Promise<void> => {
    const queue = await getQueue();
    const failedMutations = queue.filter(m => m.status === 'failed');
    await Promise.all(failedMutations.map(m => removeMutation(m.id)));
};

// Initialize DB on module load
initDB().catch(console.error);
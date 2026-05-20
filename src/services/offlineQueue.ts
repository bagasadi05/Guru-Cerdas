/**
 * Enhanced Offline Queue Service
 * 
 * This module provides an advanced queueing system for database mutations when the application
 * is offline. Features include:
 * - Status tracking (pending, processing, failed, success)
 * - Retry counter with exponential backoff (1s, 2s, 4s)
 * - IndexedDB for persistent storage
 * - Sync progress tracking
 * - Conflict resolution (local wins, server wins, merge, manual)
 * - Cached operations with TTL
 * - Background Sync Registration
 * 
 * @module services/offlineQueue
 * @since 2.0.0
 */

import { Database } from "./database.types";
import { supabase } from "./supabase";
import { storageGetJSON, storageSetJSON, storageRemove } from '../utils/storage';
import { logger } from './logger';

// ============================================
// ORIGINAL FUNCTIONAL OFFLINE QUEUE CONSTANTS
// ============================================

const QUEUE_KEY = 'supabase-offline-queue';
const DB_NAME = 'PortalGuruOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

// ============================================
// ORIGINAL FUNCTIONAL OFFLINE QUEUE TYPES
// ============================================

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
    payload: Record<string, unknown> | Record<string, unknown>[];
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
const initDB = (): Promise<IDBDatabase> => {
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
 * Fallback to storage utility if IndexedDB fails
 */
const getQueueFromStorageUtility = async (): Promise<QueuedMutation[]> => {
    try {
        const queue = await storageGetJSON<QueuedMutation[]>(QUEUE_KEY);
        return queue || [];
    } catch (e) {
        console.error("Failed to read offline queue from storage utility", e);
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
    } catch {
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
const processMutation = async (mutation: QueuedMutation): Promise<boolean> => {
    const { table, operation, payload, onConflict } = mutation;

    try {
        let result;

        switch (operation) {
            case 'insert':
                result = await supabase.from(table).insert(payload as any);
                break;
            case 'update':
                result = await supabase.from(table).update(payload as any).match({ id: (payload as any).id });
                break;
            case 'upsert':
                if (onConflict) {
                    result = await supabase.from(table).upsert(payload as any, { onConflict });
                } else {
                    result = await supabase.from(table).upsert(payload as any);
                }
                break;
            case 'delete':
                result = await supabase.from(table).delete().match({ id: (payload as any).id });
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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await updateMutation(mutation.id, {
                status: 'failed',
                error: errorMessage,
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

// ============================================
// ENHANCED CLASS-BASED OFFLINE QUEUE TYPES
// ============================================

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'success';
export type ConflictResolution = 'local_wins' | 'server_wins' | 'merge' | 'manual';

export interface QueueItem<T = Record<string, unknown>> {
    id: string;
    type: OperationType;
    table: string;
    data: T;
    timestamp: string;
    retryCount: number;
    maxRetries: number;
    status: SyncStatus;
    error?: string;
    conflictWith?: T;
    priority: number;
}

export interface SyncResult<T = Record<string, unknown>> {
    success: boolean;
    item: QueueItem<T>;
    serverData?: T;
    conflict?: boolean;
    error?: string;
}

export interface ConflictInfo<T = Record<string, unknown>> {
    itemId: string;
    localData: T;
    serverData: T;
    localTimestamp: string;
    serverTimestamp: string;
}

// ============================================
// ENHANCED CLASS-BASED QUEUE CONSTANTS
// ============================================

const QUEUE_STORAGE_KEY = 'portal_guru_offline_queue';
const IDB_NAME = 'PortalGuruOffline';
const IDB_VERSION = 1;
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

// ============================================
// INDEXEDDB SETUP FOR ENHANCED QUEUE
// ============================================

let dbEnhanced: IDBDatabase | null = null;

async function openDatabase(): Promise<IDBDatabase> {
    if (dbEnhanced) return dbEnhanced;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            dbEnhanced = request.result;
            resolve(dbEnhanced);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Queue store
            if (!database.objectStoreNames.contains('queue')) {
                const queueStore = database.createObjectStore('queue', { keyPath: 'id' });
                queueStore.createIndex('status', 'status', { unique: false });
                queueStore.createIndex('table', 'table', { unique: false });
                queueStore.createIndex('priority', 'priority', { unique: false });
            }

            // Cache store for offline data
            if (!database.objectStoreNames.contains('cache')) {
                const cacheStore = database.createObjectStore('cache', { keyPath: 'key' });
                cacheStore.createIndex('table', 'table', { unique: false });
                cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Sync log store
            if (!database.objectStoreNames.contains('syncLog')) {
                const logStore = database.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
                logStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// ============================================
// OFFLINE QUEUE SERVICE CLASS
// ============================================

class OfflineQueueService {
    private queue: QueueItem<Record<string, unknown>>[] = [];
    private syncInProgress = false;
    private listeners: Set<(queue: QueueItem<Record<string, unknown>>[]) => void> = new Set();

    constructor() {
        this.loadQueue();
        this.setupOnlineListener();
    }

    private async loadQueue(): Promise<void> {
        try {
            const database = await openDatabase();
            const transaction = database.transaction(['queue'], 'readonly');
            const store = transaction.objectStore('queue');
            const request = store.getAll();

            request.onsuccess = () => {
                this.queue = request.result || [];
                this.notifyListeners();
            };
        } catch {
            // Fallback to storage utility
            const stored = await storageGetJSON<QueueItem<Record<string, unknown>>[]>(QUEUE_STORAGE_KEY);
            this.queue = stored || [];
        }
    }

    private async saveQueue(): Promise<void> {
        try {
            const database = await openDatabase();
            const transaction = database.transaction(['queue'], 'readwrite');
            const store = transaction.objectStore('queue');

            // Clear and re-add all items
            await new Promise<void>((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });

            for (const item of this.queue) {
                store.add(item);
            }
        } catch {
            // Fallback to storage utility
            await storageSetJSON(QUEUE_STORAGE_KEY, this.queue);
        }

        this.notifyListeners();
    }

    private setupOnlineListener(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                logger.info('Connection restored, starting sync', 'OfflineQueue');
                this.processQueue();
            });
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener([...this.queue]));
    }

    // Subscribe to queue changes
    subscribe(callback: (queue: QueueItem[]) => void): () => void {
        this.listeners.add(callback);
        callback([...this.queue]);
        return () => this.listeners.delete(callback);
    }

    // Add item to queue
    async add<T extends Record<string, unknown>>(
        type: OperationType,
        table: string,
        data: T,
        priority: number = 5
    ): Promise<string> {
        const id = crypto.randomUUID();
        const item: QueueItem<T & { _localTimestamp: string }> = {
            id,
            type,
            table,
            data: { ...data, _localTimestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
            retryCount: 0,
            maxRetries: MAX_RETRIES,
            status: 'pending',
            priority
        };

        this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority);
        await this.saveQueue();

        logger.info(`Added to offline queue: ${type} ${table}`, 'OfflineQueue', { id });

        // Try to sync if online
        if (navigator.onLine) {
            this.processQueue();
        }

        return id;
    }

    // Remove item from queue
    async remove(id: string): Promise<void> {
        this.queue = this.queue.filter(item => item.id !== id);
        await this.saveQueue();
    }

    // Update item status
    async updateStatus(id: string, status: SyncStatus, error?: string): Promise<void> {
        const item = this.queue.find(i => i.id === id);
        if (item) {
            item.status = status;
            if (error) item.error = error;
            await this.saveQueue();
        }
    }

    // Get queue
    getQueue(): QueueItem[] {
        return [...this.queue];
    }

    // Get pending count
    getPendingCount(): number {
        return this.queue.filter(i => i.status === 'pending' || i.status === 'failed').length;
    }

    // Get failed items
    getFailedItems(): QueueItem[] {
        return this.queue.filter(i => i.status === 'failed');
    }

    // Clear queue
    async clear(): Promise<void> {
        this.queue = [];
        await this.saveQueue();
    }

    // Clear failed items
    async clearFailed(): Promise<void> {
        this.queue = this.queue.filter(i => i.status !== 'failed');
        await this.saveQueue();
    }

    // Retry failed items
    async retryFailed(): Promise<void> {
        for (const item of this.queue) {
            if (item.status === 'failed') {
                item.status = 'pending';
                item.retryCount = 0;
                item.error = undefined;
            }
        }
        await this.saveQueue();
        this.processQueue();
    }

    // Process queue
    async processQueue(syncFn?: (item: QueueItem) => Promise<SyncResult>): Promise<void> {
        if (this.syncInProgress || !navigator.onLine) return;

        this.syncInProgress = true;
        logger.info('Starting queue sync', 'OfflineQueue');

        const pendingItems = this.queue.filter(i => i.status === 'pending');

        for (const item of pendingItems) {
            try {
                item.status = 'syncing';
                await this.saveQueue();

                if (syncFn) {
                    const result = await syncFn(item);
                    await this.handleSyncResult(result);
                } else {
                    // Default: mark as success (actual sync should be implemented)
                    item.status = 'success';
                    await this.saveQueue();
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                await this.handleSyncError(item, error);
            }
        }

        // Remove successful items
        this.queue = this.queue.filter(i => i.status !== 'success');
        await this.saveQueue();

        this.syncInProgress = false;
        logger.info('Queue sync completed', 'OfflineQueue');
    }

    private async handleSyncResult(result: SyncResult): Promise<void> {
        const item = this.queue.find(i => i.id === result.item.id);
        if (!item) return;

        if (result.success) {
            item.status = 'success';
            await this.logSync(item, 'success');
        } else if (result.conflict) {
            item.status = 'failed';
            item.error = 'Conflict detected';
            item.conflictWith = result.serverData;
            await this.logSync(item, 'conflict');
        } else {
            await this.handleSyncError(item, new Error(result.error || 'Sync failed'));
        }

        await this.saveQueue();
    }

    private async handleSyncError(item: QueueItem<Record<string, unknown>>, error: Error | { message?: string }): Promise<void> {
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
            item.status = 'failed';
            item.error = error.message || 'Max retries exceeded';
            await this.logSync(item, 'failed');
        } else {
            item.status = 'pending';
            item.error = `Retry ${item.retryCount}/${item.maxRetries}: ${error.message}`;

            // Schedule retry with exponential backoff
            const delay = RETRY_DELAYS[Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1)];
            setTimeout(() => this.processQueue(), delay);
        }

        await this.saveQueue();
        logger.warn(`Sync error for ${item.id}`, 'OfflineQueue', { error: error.message, retryCount: item.retryCount });
    }

    private async logSync(item: QueueItem, result: string): Promise<void> {
        try {
            const database = await openDatabase();
            const transaction = database.transaction(['syncLog'], 'readwrite');
            const store = transaction.objectStore('syncLog');

            store.add({
                itemId: item.id,
                type: item.type,
                table: item.table,
                result,
                timestamp: new Date().toISOString(),
                error: item.error
            });
        } catch {
            // Ignore log errors
        }
    }
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

/**
 * Resolves a synchronization conflict between local and server data states.
 *
 * Depending on the strategy selected, either the local state wins, the server
 * state wins, fields are merged based on the newest timestamp, or a flag is
 * returned indicating manual resolution is required.
 *
 * @template T - The record structure.
 * @param {T & { _localTimestamp?: string }} local - Local record data.
 * @param {T & { updated_at?: string }} server - Server record data.
 * @param {ConflictResolution} strategy - Resolution strategy to apply.
 * @returns {T | { local: T; server: T; needsManualResolution: true }} The resolved record or resolution details.
 */
export function resolveConflict<T extends Record<string, unknown>>(
    local: T & { _localTimestamp?: string },
    server: T & { updated_at?: string },
    strategy: ConflictResolution
): T | { local: T; server: T; needsManualResolution: true } {
    switch (strategy) {
        case 'local_wins':
            return local;

        case 'server_wins':
            return server;

        case 'merge': {
            // Merge strategy: newer field values win
            const merged = { ...server };
            for (const key of Object.keys(local) as (keyof T)[]) {
                const keyStr = String(key);
                if (keyStr.startsWith('_')) continue; // Skip internal fields

                const localTime = new Date(local._localTimestamp || 0).getTime();
                const serverTime = new Date(server.updated_at || 0).getTime();

                if (localTime > serverTime) {
                    (merged as Record<string, unknown>)[keyStr] = local[key];
                }
            }
            return merged as T;
        }

        case 'manual':
            // Return both for manual resolution
            return { local, server, needsManualResolution: true };

        default:
            return server;
    }
}

/**
 * Detects if a synchronization conflict exists between a local record and server record.
 *
 * A conflict is defined when the server record has a newer updated timestamp
 * than the local record's timestamp and both share the same identifier.
 *
 * @template T - The record structure.
 * @param {T} local - Local record data.
 * @param {T | null} server - Server record data.
 * @returns {boolean} True if a synchronization conflict is detected, otherwise false.
 */
export function detectConflict<T extends Record<string, unknown> & { id?: string; updated_at?: string; _localTimestamp?: string }>(
    local: T,
    server: T | null
): boolean {
    if (!server) return false;

    const localTime = new Date(local._localTimestamp || local.updated_at || 0).getTime();
    const serverTime = new Date(server.updated_at || 0).getTime();

    // Conflict if server has newer data than our local timestamp
    return serverTime > localTime && local.id === server.id;
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Caches data locally using IndexedDB with a configurable time-to-live (TTL).
 *
 * @template T - The cached data structure.
 * @param {string} key - Cache identifier.
 * @param {string} table - Source table name.
 * @param {T} data - Data to cache.
 * @param {number} [ttl=3600000] - Time-to-live in milliseconds (default is 1 hour).
 * @returns {Promise<void>} Resolves when the cache operation completes.
 */
export async function cacheData<T>(
    key: string,
    table: string,
    data: T,
    ttl: number = 3600000 // 1 hour default
): Promise<void> {
    try {
        const database = await openDatabase();
        const transaction = database.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        const cacheItem = {
            key,
            table,
            data,
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttl).toISOString()
        };

        store.put(cacheItem);
    } catch (error) {
        logger.warn('Failed to cache data', 'OfflineCache', { error });
    }
}

/**
 * Retrieves cached data from IndexedDB, checking for expiration.
 *
 * If the cached item has expired, it is deleted and null is returned.
 *
 * @template T - The cached data structure.
 * @param {string} key - Cache identifier.
 * @returns {Promise<T | null>} The cached data if valid, otherwise null.
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    try {
        const database = await openDatabase();
        const transaction = database.transaction(['cache'], 'readonly');
        const store = database.transaction(['cache'], 'readonly').objectStore('cache');

        return new Promise((resolve) => {
            const request = store.get(key);

            request.onsuccess = () => {
                const item = request.result;
                if (!item) {
                    resolve(null);
                    return;
                }

                // Check expiry
                if (new Date(item.expiresAt) < new Date()) {
                    // Expired, delete and return null
                    const deleteTransaction = database.transaction(['cache'], 'readwrite');
                    deleteTransaction.objectStore('cache').delete(key);
                    resolve(null);
                    return;
                }

                resolve(item.data as T);
            };

            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

/**
 * Invalidates the local cache, either for a specific table or completely.
 *
 * @param {string} [table] - Source table name to invalidate, or undefined to clear all.
 * @returns {Promise<void>} Resolves when the cache is invalidated.
 */
export async function invalidateCache(table?: string): Promise<void> {
    try {
        const database = await openDatabase();
        const transaction = database.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        if (table) {
            const index = store.index('table');
            const request = index.openCursor(IDBKeyRange.only(table));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } else {
            store.clear();
        }
    } catch {
        // Ignore cache errors
    }
}

// ============================================
// BACKGROUND SYNC
// ============================================

// Interface for ServiceWorkerRegistration with sync capability
interface SyncManager {
    register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
    sync?: SyncManager;
}

/**
 * Registers a background sync tag with the Service Worker sync manager.
 *
 * Enables automatic background synchronization when online connection is restored.
 *
 * @returns {Promise<boolean>} True if background sync registration succeeded, otherwise false.
 */
export async function registerBackgroundSync(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
        logger.warn('Background Sync not supported', 'OfflineSync');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistrationWithSync;
        if (registration.sync) {
            await registration.sync.register('offline-sync');
            logger.info('Background Sync registered', 'OfflineSync');
            return true;
        }
        return false;
    } catch (error) {
        logger.warn('Failed to register Background Sync', 'OfflineSync', { error });
        return false;
    }
}

// ============================================
// CLASS INSTANCES & INITIALIZATION
// ============================================

export const offlineQueue = new OfflineQueueService();

// Initialize functional DB on module load when IndexedDB is available.
if (typeof indexedDB !== 'undefined') {
    initDB().catch(console.error);
}

export default offlineQueue;

/**
 * Enhanced Offline Queue Service
 * Features: Conflict resolution, retry mechanism, IndexedDB caching
 */

import { logger } from './logger';

// ============================================
// TYPES
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
// CONSTANTS
// ============================================

const QUEUE_STORAGE_KEY = 'portal_guru_offline_queue';
// Note: SYNC_LOG_KEY is used for IndexedDB sync logging but kept for reference
const IDB_NAME = 'PortalGuruOffline';
const IDB_VERSION = 1;
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

// ============================================
// INDEXEDDB SETUP
// ============================================

let db: IDBDatabase | null = null;

async function openDatabase(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
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
// QUEUE OPERATIONS
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
            // Fallback to localStorage
            const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
            this.queue = stored ? JSON.parse(stored) : [];
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
            // Fallback to localStorage
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
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

export async function getCachedData<T>(key: string): Promise<T | null> {
    try {
        const database = await openDatabase();
        const transaction = database.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');

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
// EXPORTS
// ============================================

export const offlineQueue = new OfflineQueueService();

export default offlineQueue;

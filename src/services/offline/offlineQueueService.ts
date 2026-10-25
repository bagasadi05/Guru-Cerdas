import { openDatabase, QUEUE_STORAGE_KEY, MAX_RETRIES, RETRY_DELAYS } from './enhancedDb';
import { logger } from '../logger';
import { storageGetJSON, storageSetJSON } from '../../utils/storage';
import { supabase } from '../supabase';
import type {
    QueueItem,
    SyncResult,
    OperationType,
    SyncStatus,
} from './types';


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

    async add<T extends Record<string, unknown>>(
        type: OperationType,
        table: string,
        data: T,
        priority: number = 5
    ): Promise<string> {
        const id = crypto.randomUUID();
        const sessionData = await supabase.auth.getSession().catch(() => null);
        const userId = sessionData?.data?.session?.user?.id || null;

        const item: QueueItem<T & { _localTimestamp: string }> = {
            id,
            type,
            table,
            data: { ...data, _localTimestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
            retryCount: 0,
            maxRetries: MAX_RETRIES,
            status: 'pending',
            priority,
            userId
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
                try {
                    await this.handleSyncError(item, error);
                } catch (haltError) {
                    logger.info('Sync queue processing halted due to auth/session issue', 'OfflineQueue', haltError);
                    this.syncInProgress = false;
                    return; // Exit processQueue early
                }
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
        const errCode = (error as any)?.code;
        const errMsg = error.message || '';
        const isSessionIssue = errCode === 'SESSION_NULL' || errCode === 'SESSION_EXPIRED' || errCode === 'USER_MISMATCH' || errCode === 'USER_AMBIGUOUS';

        if (isSessionIssue) {
            item.status = 'pending';
            item.error = errMsg;
            await this.saveQueue();
            logger.warn(`Sync paused for ${item.id} due to session/user state: ${errMsg}`, 'OfflineQueue');
            throw error; // Re-throw to halt processQueue loop
        }

        const isRLSError = errCode === '42501' || errMsg.includes('42501') || errMsg.includes('403') || errMsg.includes('RLS_FORBIDDEN') || errMsg.includes('permission denied');
        if (isRLSError) {
            item.status = 'failed';
            item.error = `Akses ditolak: ${errMsg}`;
            await this.logSync(item, 'failed');
            await this.saveQueue();
            logger.error(`Sync failed for ${item.id} due to RLS Access Denied`, 'OfflineQueue', error);
            return;
        }

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

            // Prune: delete older than 7 days OR limit to max 500 entries
            const countRequest = store.count();
            countRequest.onsuccess = () => {
                const count = countRequest.result;
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                
                const timestampIndex = store.index('timestamp');
                const range = IDBKeyRange.upperBound(sevenDaysAgo);
                const cursorRequest = timestampIndex.openCursor(range);
                cursorRequest.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        if (count > 500) {
                            const oldestCursorRequest = store.openCursor();
                            let deletedCount = 0;
                            const toDelete = count - 500;
                            oldestCursorRequest.onsuccess = (ev) => {
                                const oldestCursor = (ev.target as IDBRequest).result;
                                if (oldestCursor && deletedCount < toDelete) {
                                    oldestCursor.delete();
                                    deletedCount++;
                                    oldestCursor.continue();
                                }
                            };
                        }
                    }
                };
            };
        } catch {
            // Ignore log errors
        }
    }
}

export const offlineQueue = new OfflineQueueService();

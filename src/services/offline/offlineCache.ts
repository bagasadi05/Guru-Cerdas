import { openDatabase } from './enhancedDb';
import { logger } from '../logger';

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

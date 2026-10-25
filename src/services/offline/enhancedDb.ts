
export const QUEUE_STORAGE_KEY = 'portal_guru_offline_queue';
export const IDB_NAME = 'PortalGuruOffline';
export const IDB_VERSION = 1;
export const MAX_RETRIES = 5;
export const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

// ============================================
// INDEXEDDB SETUP FOR ENHANCED QUEUE
// ============================================

let dbEnhanced: IDBDatabase | null = null;

export async function openDatabase(): Promise<IDBDatabase> {
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

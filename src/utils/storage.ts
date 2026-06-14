/**
 * Universal Storage Utility (PWA / Web only)
 *
 * Provides a unified, async storage API for the browser:
 *
 * - **Web**: Uses IndexedDB via a lightweight wrapper (larger quota, async, XSS-resilient).
 * - **Fallback**: In-memory `Map` (data lost on refresh, but app won't crash).
 *
 * NEVER falls back to `localStorage`, which is synchronous, limited (5 MB),
 * and vulnerable to XSS exfiltration.
 */

// ============================================
// TYPES
// ============================================

interface StorageBackend {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}

// ============================================
// BACKENDS
// ============================================

/**
 * IndexedDB backend (for web / PWA)
 */
const createIndexedDBBackend = (): StorageBackend => {
    const DB_NAME = 'portal_guru_storage';
    const STORE_NAME = 'kv';
    const DB_VERSION = 1;

    const open = (): Promise<IDBDatabase> =>
        new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

    return {
        async get(key) {
            const db = await open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = () => resolve((req.result as string) ?? null);
                req.onerror = () => reject(req.error);
            });
        },
        async set(key, value) {
            const db = await open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },
        async remove(key) {
            const db = await open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },
        async keys() {
            const db = await open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).getAllKeys();
                req.onsuccess = () => resolve(req.result.map(String));
                req.onerror = () => reject(req.error);
            });
        },
    };
};

/**
 * In-memory fallback (data lost on refresh — last resort)
 */
const createMemoryBackend = (): StorageBackend => {
    const store = new Map<string, string>();
    return {
        async get(key) {
            return store.get(key) ?? null;
        },
        async set(key, value) {
            store.set(key, value);
        },
        async remove(key) {
            store.delete(key);
        },
        async keys() {
            return Array.from(store.keys());
        },
    };
};

// ============================================
// BACKEND SELECTION
// ============================================

let _backend: StorageBackend | null = null;

/**
 * Returns the best available storage backend.
 * Caches the result after first call.
 */
const getBackend = async (): Promise<StorageBackend> => {
    if (_backend) return _backend;

    // 1. Web / PWA → IndexedDB
    if (typeof indexedDB !== 'undefined') {
        try {
            _backend = createIndexedDBBackend();
            // Quick health check
            await _backend.get('__health__');
            return _backend;
        } catch {
            // IndexedDB unavailable (e.g. private browsing) — fall through
        }
    }

    // 2. Fallback → Memory
    console.warn('[Storage] Falling back to in-memory storage. Data will be lost on refresh.');
    _backend = createMemoryBackend();
    return _backend;
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Get a string value by key.
 */
export async function storageGet(key: string): Promise<string | null> {
    const backend = await getBackend();
    return backend.get(key);
}

/**
 * Set a string value by key.
 */
export async function storageSet(key: string, value: string): Promise<void> {
    const backend = await getBackend();
    return backend.set(key, value);
}

/**
 * Remove a value by key.
 */
export async function storageRemove(key: string): Promise<void> {
    const backend = await getBackend();
    return backend.remove(key);
}

/**
 * Get all keys currently stored.
 */
export async function storageKeys(): Promise<string[]> {
    const backend = await getBackend();
    return backend.keys();
}

// ============================================
// TYPED CONVENIENCE HELPERS
// ============================================

/**
 * Get a JSON-serialized value, parsed and typed.
 */
export async function storageGetJSON<T>(key: string): Promise<T | null> {
    const raw = await storageGet(key);
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Set a value as JSON.
 */
export async function storageSetJSON<T>(key: string, value: T): Promise<void> {
    return storageSet(key, JSON.stringify(value));
}

import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';
import { persistQueryClient, Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { storageGetJSON, storageSetJSON, storageRemove } from '../utils/storage';

/**
 * Centrally configured QueryClient with automatic IndexedDB persistence.
 * This enables robust offline caching support across browser reloads for
 * MI Al Irsyad Kota Madiun portal (Guru-Cerdas).
 * 
 * Configured features:
 * - staleTime: 5 minutes (data remains fresh for 5 minutes)
 * - gcTime: 7 days (cached data is kept in storage for 7 days before garbage collection)
 * - Persister: Custom Async Persister using XSS-resilient IndexedDB storage
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      refetchOnWindowFocus: false,
    },
  },
});

// Cache buster version — bump this when data shape changes to force invalidation
const CACHE_BUSTER = 'v2';

const PERSIST_THROTTLE_MS = 1000;

/**
 * Initialize query persistence. Call this once during app startup
 * (e.g., inside AppProviders) rather than at module scope to avoid
 * race conditions with DOM readiness.
 */
export function initQueryPersistence(): void {
  if (typeof window === 'undefined') return;

  // persistQueryClient calls persistClient on every cache event, and each
  // call JSON-serializes the whole cache on the main thread. Coalesce bursts
  // (a page load fires dozens of events) into one write per interval.
  let pending: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const client = pending;
    pending = null;
    if (!client) return;
    try {
      await storageSetJSON('portal_guru_query_cache', client);
    } catch (err) {
      logger.error('Failed to persist query client to IndexedDB', undefined, err);
    }
  };

  // Write before the tab is hidden or killed so the last burst is not lost.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });

  const persister: Persister = {
    persistClient: async (client: PersistedClient) => {
      pending = client;
      if (!timer) timer = setTimeout(() => void flush(), PERSIST_THROTTLE_MS);
    },
    restoreClient: async () => {
      try {
        const client = await storageGetJSON<PersistedClient>('portal_guru_query_cache');
        return client ?? undefined;
      } catch (err) {
        logger.error('Failed to restore query client from IndexedDB', undefined, err);
        return undefined;
      }
    },
    removeClient: async () => {
      pending = null;
      if (timer) clearTimeout(timer);
      timer = null;
      try {
        await storageRemove('portal_guru_query_cache');
      } catch (err) {
        logger.error('Failed to remove query client from IndexedDB', undefined, err);
      }
    }
  };

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (matching gcTime)
    buster: CACHE_BUSTER,
  });
}

export default queryClient;

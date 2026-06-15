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

/**
 * Initialize query persistence. Call this once during app startup
 * (e.g., inside AppProviders) rather than at module scope to avoid
 * race conditions with DOM readiness.
 */
export function initQueryPersistence(): void {
  if (typeof window === 'undefined') return;

  const persister: Persister = {
    persistClient: async (client: PersistedClient) => {
      try {
        await storageSetJSON('portal_guru_query_cache', client);
      } catch (err) {
        logger.error('Failed to persist query client to IndexedDB', undefined, err);
      }
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

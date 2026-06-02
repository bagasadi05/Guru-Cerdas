import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/**
 * Centrally configured QueryClient with automatic localStorage persistence.
 * This enables robust offline caching support across browser reloads for
 * MI Al Irsyad Kota Madiun portal (Guru-Cerdas).
 * 
 * Configured features:
 * - staleTime: 5 minutes (data remains fresh for 5 minutes)
 * - gcTime: 7 days (cached data is kept in storage for 7 days before garbage collection)
 * - Persister: createSyncStoragePersister with 1s throttling
 * - QuotaExceededError safety mechanism (automatically clears cache if localStorage gets full)
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

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'portal_guru_query_cache',
    throttleTime: 1000,
    retry: (opts) => {
      const err = opts.error;
      if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        logger.warn('LocalStorage quota exceeded for query cache persister, clearing client cache...');
        try {
          window.localStorage.removeItem('portal_guru_query_cache');
        } catch (e) {
          logger.error('Failed to clear query cache from localStorage', undefined, e);
        }
      }
      return undefined;
    }
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (matching gcTime)
    buster: CACHE_BUSTER,
  });
}

export default queryClient;

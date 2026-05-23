import { QueryClient } from '@tanstack/react-query';
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

// Create sync storage persister for localStorage
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'portal_guru_query_cache',
  throttleTime: 1000, // 1 second throttle to group multiple writes
  retry: (opts) => {
    const err = opts.error;
    // Graceful handling for localStorage quota limits
    if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded for query cache persister, clearing client cache...');
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('portal_guru_query_cache');
        }
      } catch (e) {
        console.error('Failed to clear query cache from localStorage', e);
      }
    }
    return undefined;
  }
});

// Configure queryClient persistence
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (matching gcTime)
  buster: 'v1', // Cache buster version to force invalidation when layout/data changes
});

export default queryClient;

/**
 * Offline Queue Facade
 *
 * The live offline stack is the functional queue in src/services/offline/:
 * an IndexedDB mutation queue replayed by `processMutation`, driven by
 * `useSyncQueue` (OfflineBanner) and `SyncProgressIndicator`. Producers:
 * `services/supabase.ts` and `useAttendanceActions` via `addToQueue`.
 *
 * The former class-based `OfflineQueueService` and its cache/background-sync
 * helpers were removed as dead code (2026-11-16); see
 * docs/reviews/2026-11-16-masukan-strategis.md §4.4. The conflict-resolution
 * helpers remain exported for the offline-parity work (F3.6).
 *
 * @module services/offlineQueue
 */

export * from './offline';

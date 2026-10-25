/**
 * Enhanced Offline Queue Service Facade
 * 
 * Modularized under src/services/offline/:
 * - ./offline/types.ts
 * - ./offline/enhancedDb.ts
 * - ./offline/conflictResolver.ts
 * - ./offline/offlineCache.ts
 * - ./offline/backgroundSync.ts
 * - ./offline/functionalQueue.ts
 * - ./offline/offlineQueueService.ts
 * 
 * @module services/offlineQueue
 */

export * from './offline';
import { offlineQueue } from './offline';
export default offlineQueue;

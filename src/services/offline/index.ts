export * from './types';
export * from './enhancedDb';
export * from './conflictResolver';
export * from './offlineCache';
export * from './backgroundSync';
export * from './functionalQueue';
export * from './offlineQueueService';

import { offlineQueue } from './offlineQueueService';
import { initDB } from './functionalQueue';
import { logger } from '../logger';

if (typeof indexedDB !== 'undefined') {
    initDB().catch((err: unknown) => logger.error('Failed to initialize IndexedDB', undefined, err));
}

export default offlineQueue;

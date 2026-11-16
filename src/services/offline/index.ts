export * from './types';
export * from './conflictResolver';
export * from './functionalQueue';

import { initDB } from './functionalQueue';
import { logger } from '../logger';

if (typeof indexedDB !== 'undefined') {
    initDB().catch((err: unknown) => logger.error('Failed to initialize IndexedDB', undefined, err));
}

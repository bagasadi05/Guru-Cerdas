import { logger } from '../logger';

// Interface for ServiceWorkerRegistration with sync capability
interface SyncManager {
    register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
    sync?: SyncManager;
}

/**
 * Registers a background sync tag with the Service Worker sync manager.
 *
 * Enables automatic background synchronization when online connection is restored.
 *
 * @returns {Promise<boolean>} True if background sync registration succeeded, otherwise false.
 */
export async function registerBackgroundSync(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
        logger.warn('Background Sync not supported', 'OfflineSync');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistrationWithSync;
        if (registration.sync) {
            await registration.sync.register('offline-sync');
            logger.info('Background Sync registered', 'OfflineSync');
            return true;
        }
        return false;
    } catch (error) {
        logger.warn('Failed to register Background Sync', 'OfflineSync', { error });
        return false;
    }
}

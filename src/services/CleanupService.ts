/**
 * Cleanup Service
 * 
 * Handles cleanup of expired soft-deleted records and action history.
 * Should be run periodically (daily) via scheduled job or on app startup.
 */

import { cleanupExpired as cleanupSoftDeleted, SoftDeleteEntity } from './SoftDeleteService';
import { cleanupExpiredActions } from './UndoManager';

export interface CleanupResult {
    success: boolean;
    deletedRecords: Record<SoftDeleteEntity, number>;
    deletedActions: number;
    timestamp: Date;
    error?: string;
}

// Storage key for last cleanup time
const LAST_CLEANUP_KEY = 'lastCleanupTimestamp';

/**
 * Check if cleanup should run (once per day)
 */
export function shouldRunCleanup(): boolean {
    try {
        const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
        if (!lastCleanup) return true;

        const lastCleanupDate = new Date(lastCleanup);
        const now = new Date();

        // Check if it's been more than 24 hours
        const hoursDiff = (now.getTime() - lastCleanupDate.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= 24;
    } catch {
        return true;
    }
}

/**
 * Run cleanup for expired records and actions
 */
export async function runCleanup(): Promise<CleanupResult> {
    const timestamp = new Date();

    try {
        console.log('[Cleanup] Starting cleanup job...');

        // Cleanup soft-deleted records older than 30 days
        const softDeleteResult = await cleanupSoftDeleted();

        // Cleanup expired action history (continue even if soft delete failed)
        const actionsResult = await cleanupExpiredActions();

        // Update last cleanup timestamp even if there were partial failures
        localStorage.setItem(LAST_CLEANUP_KEY, timestamp.toISOString());

        // Log statistics
        const totalDeleted = Object.values(softDeleteResult.deletedCounts).reduce((a, b) => a + b, 0);
        console.log('[Cleanup] Cleanup completed:', {
            softDeleteSuccess: softDeleteResult.success,
            actionsSuccess: actionsResult.success,
            deletedRecords: totalDeleted,
            deletedActions: actionsResult.deleted,
            breakdown: softDeleteResult.deletedCounts,
        });

        return {
            success: softDeleteResult.success && actionsResult.success,
            deletedRecords: softDeleteResult.deletedCounts,
            deletedActions: actionsResult.deleted,
            timestamp,
            error: softDeleteResult.error || actionsResult.error,
        };
    } catch (error) {
        console.error('[Cleanup] Cleanup failed:', error);
        return {
            success: false,
            deletedRecords: { students: 0, classes: 0, attendance: 0, tasks: 0 },
            deletedActions: 0,
            timestamp,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Run cleanup if needed (checks if 24 hours have passed)
 */
export async function runCleanupIfNeeded(): Promise<CleanupResult | null> {
    if (!shouldRunCleanup()) {
        console.log('[Cleanup] Skipping cleanup - already ran within 24 hours');
        return null;
    }

    return runCleanup();
}

/**
 * Schedule cleanup to run periodically
 * Call this once when app initializes
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanupScheduler(): void {
    // Run cleanup on startup if needed (wrapped in try-catch to not break app)
    runCleanupIfNeeded().catch(err => {
        console.warn('[Cleanup] Startup cleanup failed (non-fatal):', err);
    });

    // Schedule to run every hour and check if cleanup is needed
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    cleanupInterval = setInterval(() => {
        runCleanupIfNeeded().catch(err => {
            console.warn('[Cleanup] Scheduled cleanup failed (non-fatal):', err);
        });
    }, 60 * 60 * 1000); // Check every hour

    console.log('[Cleanup] Cleanup scheduler started');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('[Cleanup] Cleanup scheduler stopped');
    }
}

/**
 * Get last cleanup info
 */
export function getLastCleanupInfo(): { timestamp: Date | null; hoursAgo: number | null } {
    try {
        const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
        if (!lastCleanup) return { timestamp: null, hoursAgo: null };

        const timestamp = new Date(lastCleanup);
        const hoursAgo = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60));

        return { timestamp, hoursAgo };
    } catch {
        return { timestamp: null, hoursAgo: null };
    }
}

export default {
    shouldRunCleanup,
    runCleanup,
    runCleanupIfNeeded,
    startCleanupScheduler,
    stopCleanupScheduler,
    getLastCleanupInfo,
};

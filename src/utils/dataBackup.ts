/**
 * Data Backup Utilities
 * 
 * Provides backup functionality before save operations
 */

const BACKUP_PREFIX = 'backup_';
const BACKUP_EXPIRY_HOURS = 24;

interface BackupData<T> {
    data: T;
    timestamp: number;
    context: string;
    version: number;
}

interface BackupOptions {
    /**
     * Unique identifier for the backup (e.g., 'grade_input_class123')
     */
    key: string;
    /**
     * Human-readable context for the backup
     */
    context?: string;
    /**
     * Hours before backup expires (default: 24)
     */
    expiryHours?: number;
}

/**
 * Create a backup of data before saving
 */
export const createBackup = <T>(data: T, options: BackupOptions): boolean => {
    try {
        const {
            key,
            context = 'Unknown operation',
            expiryHours = BACKUP_EXPIRY_HOURS,
        } = options;

        const backup: BackupData<T> = {
            data,
            timestamp: Date.now(),
            context,
            version: 1,
        };

        localStorage.setItem(BACKUP_PREFIX + key, JSON.stringify(backup));

        // Schedule cleanup
        scheduleBackupCleanup(key, expiryHours);

        return true;
    } catch (error) {
        console.error('Failed to create backup:', error);
        return false;
    }
};

/**
 * Get the latest backup for a key
 */
export const getBackup = <T>(key: string): BackupData<T> | null => {
    try {
        const stored = localStorage.getItem(BACKUP_PREFIX + key);
        if (!stored) return null;

        const backup = JSON.parse(stored) as BackupData<T>;

        // Check if expired (24 hours default)
        const expiryTime = backup.timestamp + (BACKUP_EXPIRY_HOURS * 60 * 60 * 1000);
        if (Date.now() > expiryTime) {
            removeBackup(key);
            return null;
        }

        return backup;
    } catch (error) {
        console.error('Failed to get backup:', error);
        return null;
    }
};

/**
 * Remove a specific backup
 */
export const removeBackup = (key: string): void => {
    try {
        localStorage.removeItem(BACKUP_PREFIX + key);
    } catch (error) {
        console.error('Failed to remove backup:', error);
    }
};

/**
 * Get all available backups
 */
export const getAllBackups = (): { key: string; backup: BackupData<unknown> }[] => {
    const backups: { key: string; backup: BackupData<unknown> }[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(BACKUP_PREFIX)) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const backup = JSON.parse(stored) as BackupData<unknown>;
                    backups.push({
                        key: key.replace(BACKUP_PREFIX, ''),
                        backup,
                    });
                }
            }
        }
    } catch (error) {
        console.error('Failed to get all backups:', error);
    }

    return backups;
};

/**
 * Restore data from backup
 */
export const restoreBackup = <T>(key: string): T | null => {
    const backup = getBackup<T>(key);
    return backup?.data ?? null;
};

/**
 * Clean up expired backups
 */
export const cleanupExpiredBackups = (): number => {
    let cleaned = 0;

    try {
        const now = Date.now();
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(BACKUP_PREFIX)) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const backup = JSON.parse(stored) as BackupData<unknown>;
                    const expiryTime = backup.timestamp + (BACKUP_EXPIRY_HOURS * 60 * 60 * 1000);
                    if (now > expiryTime) {
                        keysToRemove.push(key);
                    }
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            cleaned++;
        });
    } catch (error) {
        console.error('Failed to cleanup backups:', error);
    }

    return cleaned;
};

/**
 * Schedule backup cleanup after expiry
 */
const scheduleBackupCleanup = (key: string, expiryHours: number): void => {
    setTimeout(() => {
        removeBackup(key);
    }, expiryHours * 60 * 60 * 1000);
};

/**
 * Format backup timestamp to human-readable string
 */
export const formatBackupTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) {
        return 'Baru saja';
    } else if (diffMins < 60) {
        return `${diffMins} menit lalu`;
    } else if (diffHours < 24) {
        return `${diffHours} jam lalu`;
    } else {
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
};

/**
 * Create a unique backup key for grade input
 */
export const createGradeBackupKey = (
    classId: string,
    subject: string,
    assessmentName: string
): string => {
    return `grade_${classId}_${subject}_${assessmentName}`.replace(/\s+/g, '_').toLowerCase();
};

export default {
    createBackup,
    getBackup,
    removeBackup,
    getAllBackups,
    restoreBackup,
    cleanupExpiredBackups,
    formatBackupTime,
    createGradeBackupKey,
};

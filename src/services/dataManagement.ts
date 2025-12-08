/**
 * Data Management Service
 * Features: Bulk import/export, backup/restore, archiving, migrations
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { auditLog } from './securityEnhanced';

// ============================================
// TYPES
// ============================================

export type EntityType = 'students' | 'attendance' | 'tasks' | 'schedules' | 'academic_records';

interface ExportOptions {
    format: 'json' | 'csv';
    includeMetadata?: boolean;
    dateRange?: { start: Date; end: Date };
}

interface ImportResult {
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
}

interface BackupMetadata {
    id: string;
    createdAt: string;
    version: string;
    entities: EntityType[];
    recordCount: Record<EntityType, number>;
    size: number;
}

interface MigrationScript {
    version: string;
    name: string;
    up: () => Promise<void>;
    down: () => Promise<void>;
}

// ============================================
// BULK EXPORT
// ============================================

/**
 * Export all data from an entity
 */
export async function exportEntity(
    entity: EntityType,
    options: ExportOptions = { format: 'json' }
): Promise<{ data: string; filename: string }> {
    logger.info(`Exporting ${entity}`, 'DataManagement');

    let query = supabase.from(entity).select('*');

    // Apply date range filter if provided
    if (options.dateRange) {
        const dateColumn = entity === 'attendance' ? 'date' : 'created_at';
        query = query
            .gte(dateColumn, options.dateRange.start.toISOString())
            .lte(dateColumn, options.dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Export failed: ${error.message}`);
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let content: string;
    let filename: string;

    if (options.format === 'csv') {
        content = convertToCSV(data || []);
        filename = `${entity}_export_${timestamp}.csv`;
    } else {
        const exportData = options.includeMetadata
            ? {
                metadata: {
                    entity,
                    exportedAt: new Date().toISOString(),
                    recordCount: data?.length || 0,
                    version: '1.0'
                },
                data
            }
            : data;
        content = JSON.stringify(exportData, null, 2);
        filename = `${entity}_export_${timestamp}.json`;
    }

    auditLog('EXPORT_DATA', {
        details: { entity, format: options.format, recordCount: data?.length || 0 }
    });

    return { data: content, filename };
}

/**
 * Export all entities (full backup)
 */
export async function exportAllEntities(
    options: ExportOptions = { format: 'json', includeMetadata: true }
): Promise<{ data: string; filename: string }> {
    const entities: EntityType[] = ['students', 'attendance', 'tasks', 'schedules', 'academic_records'];
    const allData: Record<string, any[]> = {};
    const recordCounts: Record<string, number> = {};

    for (const entity of entities) {
        try {
            const { data } = await supabase.from(entity).select('*');
            allData[entity] = data || [];
            recordCounts[entity] = data?.length || 0;
        } catch {
            allData[entity] = [];
            recordCounts[entity] = 0;
        }
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const exportData = {
        metadata: {
            type: 'full_backup',
            exportedAt: new Date().toISOString(),
            entities,
            recordCounts,
            version: '1.0'
        },
        data: allData
    };

    auditLog('EXPORT_DATA', {
        details: { type: 'full_backup', recordCounts }
    });

    return {
        data: JSON.stringify(exportData, null, 2),
        filename: `portal_guru_backup_${timestamp}.json`
    };
}

// ============================================
// BULK IMPORT
// ============================================

/**
 * Import data to an entity
 */
export async function importEntity(
    entity: EntityType,
    fileContent: string,
    format: 'json' | 'csv' = 'json'
): Promise<ImportResult> {
    logger.info(`Importing to ${entity}`, 'DataManagement');

    let records: any[];

    try {
        if (format === 'csv') {
            records = parseCSV(fileContent);
        } else {
            const parsed = JSON.parse(fileContent);
            records = Array.isArray(parsed) ? parsed : parsed.data;
        }
    } catch (e) {
        throw new Error(`Invalid ${format.toUpperCase()} format`);
    }

    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    // Validate and transform records
    const validRecords = records.map((record, index) => {
        try {
            return validateAndTransformRecord(entity, record);
        } catch (e: any) {
            result.errors.push({ row: index + 1, message: e.message });
            result.failed++;
            return null;
        }
    }).filter(Boolean);

    // Batch insert
    if (validRecords.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
            const batch = validRecords.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from(entity).upsert(batch);

            if (error) {
                batch.forEach((_, idx) => {
                    result.errors.push({
                        row: i + idx + 1,
                        message: error.message
                    });
                    result.failed++;
                });
            } else {
                result.success += batch.length;
            }
        }
    }

    auditLog('CREATE', {
        targetType: entity,
        details: { type: 'bulk_import', ...result }
    });

    return result;
}

/**
 * Import full backup
 */
export async function importFullBackup(fileContent: string): Promise<Record<EntityType, ImportResult>> {
    const parsed = JSON.parse(fileContent);

    if (!parsed.metadata?.type || parsed.metadata.type !== 'full_backup') {
        throw new Error('Invalid backup file format');
    }

    const results: Record<string, ImportResult> = {};

    for (const entity of Object.keys(parsed.data) as EntityType[]) {
        const entityData = parsed.data[entity];
        if (Array.isArray(entityData) && entityData.length > 0) {
            results[entity] = await importEntity(entity, JSON.stringify(entityData));
        } else {
            results[entity] = { success: 0, failed: 0, errors: [] };
        }
    }

    return results as Record<EntityType, ImportResult>;
}

// ============================================
// BACKUP & RESTORE
// ============================================

const BACKUP_STORAGE_KEY = 'portal_guru_backups';

/**
 * Create a backup and store it locally
 */
export async function createBackup(): Promise<BackupMetadata> {
    const { data: backupData } = await exportAllEntities();
    const parsed = JSON.parse(backupData);

    const metadata: BackupMetadata = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        version: '1.0',
        entities: parsed.metadata.entities,
        recordCount: parsed.metadata.recordCounts,
        size: new Blob([backupData]).size
    };

    // Store in IndexedDB
    await storeBackup(metadata.id, backupData, metadata);

    auditLog('ADMIN_ACTION', {
        details: { action: 'CREATE_BACKUP', backupId: metadata.id }
    });

    return metadata;
}

/**
 * List all backups
 */
export async function listBackups(): Promise<BackupMetadata[]> {
    return await getBackupList();
}

/**
 * Restore from a backup
 */
export async function restoreBackup(backupId: string): Promise<Record<EntityType, ImportResult>> {
    const backupData = await getBackupData(backupId);

    if (!backupData) {
        throw new Error('Backup not found');
    }

    auditLog('ADMIN_ACTION', {
        details: { action: 'RESTORE_BACKUP', backupId }
    });

    return await importFullBackup(backupData);
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string): Promise<void> {
    await removeBackup(backupId);

    auditLog('ADMIN_ACTION', {
        details: { action: 'DELETE_BACKUP', backupId }
    });
}

// IndexedDB helpers for backup storage
async function storeBackup(id: string, data: string, metadata: BackupMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('backups')) {
                db.createObjectStore('backups', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const tx = db.transaction('backups', 'readwrite');
            const store = tx.objectStore('backups');
            store.put({ id, data, metadata });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function getBackupList(): Promise<BackupMetadata[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('backups')) {
                resolve([]);
                return;
            }

            const tx = db.transaction('backups', 'readonly');
            const store = tx.objectStore('backups');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const backups = getAllRequest.result.map((b: any) => b.metadata);
                resolve(backups.sort((a: BackupMetadata, b: BackupMetadata) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
            };
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function getBackupData(id: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('backups')) {
                resolve(null);
                return;
            }

            const tx = db.transaction('backups', 'readonly');
            const store = tx.objectStore('backups');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                resolve(getRequest.result?.data || null);
            };
            getRequest.onerror = () => reject(getRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function removeBackup(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('backups')) {
                resolve();
                return;
            }

            const tx = db.transaction('backups', 'readwrite');
            const store = tx.objectStore('backups');
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ============================================
// DATA ARCHIVING
// ============================================

/**
 * Archive old records based on date
 */
export async function archiveOldRecords(
    entity: EntityType,
    beforeDate: Date,
    deleteAfterArchive: boolean = false
): Promise<{ archivedCount: number; deletedCount: number }> {
    const dateColumn = entity === 'attendance' ? 'date' : 'created_at';

    // Fetch records to archive
    const { data: records, error: fetchError } = await supabase
        .from(entity)
        .select('*')
        .lt(dateColumn, beforeDate.toISOString());

    if (fetchError) {
        throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
        return { archivedCount: 0, deletedCount: 0 };
    }

    // Store archived data
    const archiveData = {
        id: crypto.randomUUID(),
        entity,
        archivedAt: new Date().toISOString(),
        beforeDate: beforeDate.toISOString(),
        recordCount: records.length,
        data: records
    };

    await storeArchive(archiveData);

    let deletedCount = 0;

    // Optionally delete original records
    if (deleteAfterArchive) {
        const ids = records.map(r => r.id);
        const { error: deleteError } = await supabase
            .from(entity)
            .delete()
            .in('id', ids);

        if (!deleteError) {
            deletedCount = ids.length;
        }
    }

    auditLog('ADMIN_ACTION', {
        details: {
            action: 'ARCHIVE_RECORDS',
            entity,
            archivedCount: records.length,
            deletedCount
        }
    });

    return { archivedCount: records.length, deletedCount };
}

/**
 * List archived data
 */
export async function listArchives(): Promise<any[]> {
    return await getArchiveList();
}

/**
 * Restore archived data
 */
export async function restoreArchive(archiveId: string): Promise<ImportResult> {
    const archive = await getArchiveData(archiveId);

    if (!archive) {
        throw new Error('Archive not found');
    }

    const result = await importEntity(archive.entity, JSON.stringify(archive.data));

    auditLog('ADMIN_ACTION', {
        details: { action: 'RESTORE_ARCHIVE', archiveId, entity: archive.entity }
    });

    return result;
}

async function storeArchive(archive: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('archives')) {
                db.createObjectStore('archives', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const tx = db.transaction('archives', 'readwrite');
            const store = tx.objectStore('archives');
            store.put(archive);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function getArchiveList(): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('archives')) {
                resolve([]);
                return;
            }

            const tx = db.transaction('archives', 'readonly');
            const store = tx.objectStore('archives');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const archives = getAllRequest.result.map((a: any) => ({
                    id: a.id,
                    entity: a.entity,
                    archivedAt: a.archivedAt,
                    recordCount: a.recordCount
                }));
                resolve(archives);
            };
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function getArchiveData(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portal_guru_db', 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('archives')) {
                resolve(null);
                return;
            }

            const tx = db.transaction('archives', 'readonly');
            const store = tx.objectStore('archives');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ============================================
// DATA MIGRATION
// ============================================

const MIGRATION_VERSION_KEY = 'portal_guru_migration_version';

const migrations: MigrationScript[] = [
    {
        version: '1.0.0',
        name: 'Initial schema',
        up: async () => {
            // Initial setup - no migration needed
        },
        down: async () => {
            // Cannot rollback initial
        }
    },
    {
        version: '1.1.0',
        name: 'Add student access codes',
        up: async () => {
            // Add access_code column if not exists (would be SQL in real scenario)
            logger.info('Migration 1.1.0: Add access codes', 'Migration');
        },
        down: async () => {
            logger.info('Rollback 1.1.0: Remove access codes', 'Migration');
        }
    },
    {
        version: '1.2.0',
        name: 'Add attendance notes',
        up: async () => {
            logger.info('Migration 1.2.0: Add attendance notes', 'Migration');
        },
        down: async () => {
            logger.info('Rollback 1.2.0: Remove attendance notes', 'Migration');
        }
    }
];

/**
 * Get current migration version
 */
export function getCurrentMigrationVersion(): string {
    return localStorage.getItem(MIGRATION_VERSION_KEY) || '0.0.0';
}

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<string[]> {
    const currentVersion = getCurrentMigrationVersion();
    const executed: string[] = [];

    for (const migration of migrations) {
        if (compareVersions(migration.version, currentVersion) > 0) {
            logger.info(`Running migration ${migration.version}: ${migration.name}`, 'Migration');

            try {
                await migration.up();
                localStorage.setItem(MIGRATION_VERSION_KEY, migration.version);
                executed.push(migration.version);

                auditLog('ADMIN_ACTION', {
                    details: { action: 'RUN_MIGRATION', version: migration.version }
                });
            } catch (e) {
                logger.error(`Migration ${migration.version} failed`, 'Migration', e as Error);
                throw e;
            }
        }
    }

    return executed;
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(targetVersion: string): Promise<string[]> {
    const currentVersion = getCurrentMigrationVersion();
    const rolledBack: string[] = [];

    const reversedMigrations = [...migrations].reverse();

    for (const migration of reversedMigrations) {
        if (
            compareVersions(migration.version, currentVersion) <= 0 &&
            compareVersions(migration.version, targetVersion) > 0
        ) {
            logger.info(`Rolling back migration ${migration.version}`, 'Migration');

            try {
                await migration.down();
                rolledBack.push(migration.version);
            } catch (e) {
                logger.error(`Rollback ${migration.version} failed`, 'Migration', e as Error);
                throw e;
            }
        }
    }

    localStorage.setItem(MIGRATION_VERSION_KEY, targetVersion);

    auditLog('ADMIN_ACTION', {
        details: { action: 'ROLLBACK_MIGRATION', targetVersion, rolledBack }
    });

    return rolledBack;
}

function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (partsA[i] > partsB[i]) return 1;
        if (partsA[i] < partsB[i]) return -1;
    }

    return 0;
}

// ============================================
// DATA VALIDATION
// ============================================

const entityValidators: Record<EntityType, (record: any) => any> = {
    students: (record) => {
        if (!record.name || typeof record.name !== 'string') {
            throw new Error('Invalid name');
        }
        if (record.gender && !['Laki-laki', 'Perempuan'].includes(record.gender)) {
            throw new Error('Invalid gender');
        }
        return {
            id: record.id,
            name: record.name.trim(),
            class: record.class?.trim() || null,
            gender: record.gender || null,
            access_code: record.access_code || null,
            parent_contact: record.parent_contact || null,
            email: record.email || null,
            birthdate: record.birthdate || null,
            student_id: record.student_id || null
        };
    },
    attendance: (record) => {
        if (!record.student_id) throw new Error('Missing student_id');
        if (!record.date) throw new Error('Missing date');
        // Use correct enum values: Hadir, Sakit, Izin, Alpha (with capital first letter)
        if (!['Hadir', 'Sakit', 'Izin', 'Alpha'].includes(record.status)) {
            throw new Error('Invalid status. Must be one of: Hadir, Sakit, Izin, Alpha');
        }
        return {
            id: record.id,
            student_id: record.student_id,
            date: record.date,
            status: record.status,
            notes: record.notes || null
        };
    },
    tasks: (record) => {
        if (!record.title) throw new Error('Missing title');
        return {
            id: record.id,
            title: record.title.trim(),
            description: record.description || null,
            due_date: record.due_date || null,
            priority: record.priority || 'medium',
            status: record.status || 'pending',
            category: record.category || null
        };
    },
    schedules: (record) => {
        if (!record.day) throw new Error('Missing day');
        if (!record.subject) throw new Error('Missing subject');
        return {
            id: record.id,
            day: record.day,
            subject: record.subject.trim(),
            start_time: record.start_time || null,
            end_time: record.end_time || null,
            room: record.room || null,
            teacher: record.teacher || null
        };
    },
    academic_records: (record) => {
        if (!record.student_id) throw new Error('Missing student_id');
        if (!record.subject) throw new Error('Missing subject');
        return {
            id: record.id,
            student_id: record.student_id,
            subject: record.subject.trim(),
            score: Number(record.score) || 0,
            assessment_name: record.assessment_name || null,
            notes: record.notes || null
        };
    }
};

function validateAndTransformRecord(entity: EntityType, record: any): any {
    const validator = entityValidators[entity];
    if (!validator) {
        throw new Error(`Unknown entity: ${entity}`);
    }
    return validator(record);
}

// ============================================
// CSV UTILITIES
// ============================================

function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

function parseCSV(content: string): any[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const record: any = {};
        headers.forEach((header, index) => {
            record[header] = values[index] || null;
        });
        return record;
    });
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// ============================================
// DOWNLOAD HELPER
// ============================================

export function downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// EXPORTS
// ============================================

export const dataManagement = {
    // Export
    exportEntity,
    exportAllEntities,

    // Import
    importEntity,
    importFullBackup,

    // Backup
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,

    // Archive
    archiveOldRecords,
    listArchives,
    restoreArchive,

    // Migration
    getCurrentMigrationVersion,
    runMigrations,
    rollbackToVersion,

    // Utilities
    downloadFile
};

export default dataManagement;

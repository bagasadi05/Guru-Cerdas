/**
 * Backup and Restore Service
 * 
 * This module provides functionality for exporting and importing complete database backups
 * for the Portal Guru application. Backups include all user data across multiple tables
 * and can be used for data migration, disaster recovery, or archival purposes.
 * 
 * Backups are exported as JSON files with versioning support for future compatibility.
 * 
 * @module services/backupService
 * @since 1.0.0
 */

import { supabase } from './supabase';
import { Database } from './database.types';

/**
 * Structure of a complete database backup.
 * 
 * This type defines the format of exported backup files, including versioning
 * information and all user data from relevant database tables.
 * 
 * @typedef {Object} BackupData
 * @property {number} version - Backup format version for compatibility checking
 * @property {number} timestamp - Unix timestamp when backup was created
 * @property {Object} data - Container for all backed up data
 * @property {Array} data.students - All student records
 * @property {Array} data.classes - All class records
 * @property {Array} data.attendance - All attendance records
 * @property {Array} data.academic_records - All academic performance records
 * @property {Array} data.violations - All behavioral violation records
 * @property {Array} data.quiz_points - All quiz and activity point records
 * @property {Array} data.reports - All report records
 * 
 * @since 1.0.0
 */
type BackupData = {
    version: number;
    timestamp: number;
    data: {
        students: Database['public']['Tables']['students']['Row'][];
        classes: Database['public']['Tables']['classes']['Row'][];
        attendance: Database['public']['Tables']['attendance']['Row'][];
        academic_records: Database['public']['Tables']['academic_records']['Row'][];
        violations: Database['public']['Tables']['violations']['Row'][];
        quiz_points: Database['public']['Tables']['quiz_points']['Row'][];
        reports: Database['public']['Tables']['reports']['Row'][];
        tasks: Database['public']['Tables']['tasks']['Row'][];
        schedules: Database['public']['Tables']['schedules']['Row'][];
    }
};

/**
 * Validation result for backup file
 */
export type ValidationResult = {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    preview?: {
        table: string;
        count: number;
    }[];
};

/**
 * Current backup format version.
 * 
 * This version number is included in all backup files and can be used
 * to handle format changes in future versions of the application.
 * 
 * @constant {number}
 * @since 1.0.0
 */
const BACKUP_VERSION = 2;

/**
 * Validate backup file structure before import
 */
export const validateBackup = (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const preview: { table: string; count: number }[] = [];

    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['File backup tidak valid: bukan objek JSON'], warnings };
    }

    const backup = data as Partial<BackupData>;

    if (!backup.version) {
        errors.push('File backup tidak memiliki informasi versi');
    } else if (backup.version < BACKUP_VERSION) {
        warnings.push(`Versi backup (${backup.version}) lebih lama dari versi saat ini (${BACKUP_VERSION})`);
    }

    if (!backup.timestamp) {
        warnings.push('File backup tidak memiliki timestamp');
    }

    if (!backup.data || typeof backup.data !== 'object') {
        errors.push('File backup tidak memiliki data');
    } else {
        const tables = ['students', 'classes', 'attendance', 'academic_records', 'violations', 'quiz_points', 'reports', 'tasks', 'schedules'];
        tables.forEach(table => {
            const tableData = backup.data?.[table as keyof typeof backup.data];
            if (tableData) {
                if (!Array.isArray(tableData)) {
                    errors.push(`Data ${table} harus berupa array`);
                } else if (tableData.length > 0) {
                    preview.push({ table, count: tableData.length });
                }
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        preview,
    };
};

/**
 * Download backup file directly
 */
export const downloadBackup = (blob: Blob, filename?: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `portal-guru-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports a complete backup of all user data to a JSON file.
 */
export const exportBackup = async (userId: string): Promise<Blob> => {
    const [studentsRes, classesRes, attendanceRes, academicRes, violationsRes, quizRes, reportsRes, tasksRes, schedulesRes] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', userId),
        supabase.from('classes').select('*').eq('user_id', userId),
        supabase.from('attendance').select('*').eq('user_id', userId),
        supabase.from('academic_records').select('*').eq('user_id', userId),
        supabase.from('violations').select('*').eq('user_id', userId),
        supabase.from('quiz_points').select('*').eq('user_id', userId),
        supabase.from('reports').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('schedules').select('*').eq('user_id', userId),
    ]);

    const errors = [studentsRes, classesRes, attendanceRes, academicRes, violationsRes, quizRes, reportsRes, tasksRes, schedulesRes].map(r => r.error).filter(Boolean);
    if (errors.length > 0) {
        throw new Error(`Export failed: ${errors[0]?.message}`);
    }

    const backupData: BackupData = {
        version: BACKUP_VERSION,
        timestamp: Date.now(),
        data: {
            students: studentsRes.data || [],
            classes: classesRes.data || [],
            attendance: attendanceRes.data || [],
            academic_records: academicRes.data || [],
            violations: violationsRes.data || [],
            quiz_points: quizRes.data || [],
            reports: reportsRes.data || [],
            tasks: tasksRes.data || [],
            schedules: schedulesRes.data || [],
        }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
};

/**
 * Imports and restores data from a backup file.
 * 
 * This function reads a backup JSON file, validates its format, and restores
 * all data to the database using upsert operations. The restore process follows
 * a specific order to respect foreign key constraints:
 * 1. Classes (no dependencies)
 * 2. Students (depends on classes)
 * 3. All other records in parallel (depend on students)
 * 
 * The function uses upsert operations, which means:
 * - Existing records with matching IDs will be updated
 * - New records will be inserted
 * - Records not in the backup will remain unchanged (not deleted)
 * 
 * This "merge" strategy is safer than a full wipe-and-restore but means
 * deleted records won't be removed during restore.
 * 
 * @param {File} file - Backup file to import (must be valid JSON)
 * @param {string} userId - ID of the user performing the import (for validation)
 * @returns {Promise<void>} Promise that resolves when import is complete
 * @throws {Error} If file is invalid, corrupted, or database operations fail
 * 
 * @example
 * ```typescript
 * import { importBackup } from './services/backupService';
 * 
 * async function restoreFromBackup(file: File, userId: string) {
 *   try {
 *     await importBackup(file, userId);
 *     console.log('Backup restored successfully');
 *     
 *     // Refresh application data
 *     window.location.reload();
 *   } catch (error) {
 *     console.error('Restore failed:', error);
 *     alert('Failed to restore backup: ' + error.message);
 *   }
 * }
 * 
 * // Usage with file input
 * const fileInput = document.querySelector('input[type="file"]');
 * fileInput.addEventListener('change', async (e) => {
 *   const file = e.target.files[0];
 *   if (file) {
 *     await restoreFromBackup(file, currentUserId);
 *   }
 * });
 * ```
 * 
 * @since 1.0.0
 */
export const importBackup = async (file: File, userId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                if (!json) throw new Error("File is empty");

                const backup: BackupData = JSON.parse(json);
                if (!backup.data || !backup.version) throw new Error("Invalid backup file format");

                // Restore Strategy:
                // Since this is a simple "Restore", and IDs are UUIDs, we can attempt to UPSERT.
                // However, to ensure a clean state (removing deleted items), a wipe + insert is often cleaner BUT dangerous.
                // Safest "Merge" approach: Upsert everything.
                // "Clean Restore" approach: Delete all for user, then insert.

                // We will use UPSERT for safety against foreign key constraints during partial failures, 
                // but we really should insert Classes -> Students -> Records.

                const scopeUserId = <T extends Record<string, any>>(rows: T[]): T[] => {
                    let mismatch = false;
                    for (const row of rows) {
                        if (!row || typeof row !== 'object') continue;
                        if (Object.prototype.hasOwnProperty.call(row, 'user_id')) {
                            const rowUserId = row.user_id;
                            if (rowUserId && rowUserId !== userId) {
                                mismatch = true;
                                break;
                            }
                        }
                    }

                    if (mismatch) {
                        throw new Error('Backup user_id does not match the current user.');
                    }

                    return rows.map(row => {
                        if (!row || typeof row !== 'object') return row;
                        if (Object.prototype.hasOwnProperty.call(row, 'user_id')) {
                            return { ...row, user_id: userId };
                        }
                        return row;
                    });
                };

                const scopedClasses = scopeUserId(backup.data.classes || []);
                const scopedStudents = scopeUserId(backup.data.students || []);
                const scopedAttendance = scopeUserId(backup.data.attendance || []);
                const scopedAcademicRecords = scopeUserId(backup.data.academic_records || []);
                const scopedViolations = scopeUserId(backup.data.violations || []);
                const scopedQuizPoints = scopeUserId(backup.data.quiz_points || []);
                const scopedReports = scopeUserId(backup.data.reports || []);
                const scopedTasks = scopeUserId(backup.data.tasks || []);
                const scopedSchedules = scopeUserId(backup.data.schedules || []);

                // 1. Upsert Classes
                if (scopedClasses.length > 0) {
                    const { error } = await supabase.from('classes').upsert(scopedClasses);
                    if (error) throw error;
                }

                // 2. Upsert Students
                if (scopedStudents.length > 0) {
                    const { error } = await supabase.from('students').upsert(scopedStudents);
                    if (error) throw error;
                }

                // 3. Upsert Records (Parallel)
                const promises = [];
                if (scopedAttendance.length > 0) promises.push(supabase.from('attendance').upsert(scopedAttendance));
                if (scopedAcademicRecords.length > 0) promises.push(supabase.from('academic_records').upsert(scopedAcademicRecords));
                if (scopedViolations.length > 0) promises.push(supabase.from('violations').upsert(scopedViolations));
                if (scopedQuizPoints.length > 0) promises.push(supabase.from('quiz_points').upsert(scopedQuizPoints));
                if (scopedReports.length > 0) promises.push(supabase.from('reports').upsert(scopedReports));
                if (scopedTasks.length > 0) promises.push(supabase.from('tasks').upsert(scopedTasks));
                if (scopedSchedules.length > 0) promises.push(supabase.from('schedules').upsert(scopedSchedules));

                const results = await Promise.all(promises);
                const errors = results.map(r => r.error).filter(Boolean);
                if (errors.length > 0) throw errors[0];

                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
};

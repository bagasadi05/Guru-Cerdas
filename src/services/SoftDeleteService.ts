/**
 * Soft Delete Service
 * 
 * Provides soft delete functionality for all entities.
 * Records can be restored within 30 days before permanent deletion.
 */

import { supabase } from './supabase';
import { logger } from './logger';
import type { Database } from './database.types';

export type SoftDeleteEntity = 'students' | 'classes' | 'attendance' | 'violations' | 'quiz_points' | 'academic_records' | 'tasks'
    | 'reports' | 'schedules' | 'communications' | 'homework' | 'extracurriculars'
    | 'student_extracurriculars' | 'extracurricular_attendance' | 'extracurricular_grades'
    | 'extracurricular_students' | 'student_achievements' | 'student_development_analyses'
    | 'school_info' | 'announcements' | 'academic_years' | 'semesters' | 'user_settings';

export interface SoftDeleteResult {
    success: boolean;
    deletedAt?: string;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    error?: string;
}

export interface DeletedItem {
    id: string;
    entity: SoftDeleteEntity;
    deletedAt: string;
    daysRemaining: number;
    data: Record<string, unknown>;
}

// Loose query builder shape for dynamic (entity-driven) table access.
// The Supabase client is strictly typed per-table, so we narrow to the
// generic chaining surface actually used by this service.
type AnyRow = Record<string, unknown>;
type QueryResult = { data: AnyRow[] | null; error: { message: string } | null };

interface SoftDeleteQuery extends PromiseLike<QueryResult> {
    update(values: AnyRow): SoftDeleteQuery;
    delete(): SoftDeleteQuery;
    select(columns: string): SoftDeleteQuery;
    eq(column: string, value: unknown): SoftDeleteQuery;
    in(column: string, values: unknown[]): SoftDeleteQuery;
    not(column: string, operator: unknown, value: unknown): SoftDeleteQuery;
    order(column: string, options: { ascending: boolean }): SoftDeleteQuery;
    lt(column: string, value: string): SoftDeleteQuery;
}

const tableQuery = (entity: SoftDeleteEntity): SoftDeleteQuery =>
    supabase.from(entity as keyof Database['public']['Tables']) as unknown as SoftDeleteQuery;

/**
 * Soft delete a record by setting deleted_at timestamp
 */
export async function softDelete(
    entity: SoftDeleteEntity,
    id: string
): Promise<SoftDeleteResult> {
    try {
        const deletedAt = new Date().toISOString();

        const { error } = await tableQuery(entity)
            .update({ deleted_at: deletedAt })
            .eq(ENTITY_KEY_COLUMN[entity], id);

        if (error) throw error;

        return { success: true, deletedAt };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to soft delete'
        };
    }
}

/**
 * Soft delete multiple records as a single operation
 */
export async function softDeleteBulk(
    entity: SoftDeleteEntity,
    ids: string[]
): Promise<SoftDeleteResult> {
    try {
        const deletedAt = new Date().toISOString();

        const { error } = await tableQuery(entity)
            .update({ deleted_at: deletedAt })
            .in(ENTITY_KEY_COLUMN[entity], ids);

        if (error) throw error;

        return { success: true, deletedAt };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to bulk soft delete'
        };
    }
}

/**
 * Restore a soft-deleted record by clearing deleted_at
 */
export async function restore(
    entity: SoftDeleteEntity,
    id: string
): Promise<RestoreResult> {
    try {
        const { error } = await tableQuery(entity)
            .update({ deleted_at: null })
            .eq(ENTITY_KEY_COLUMN[entity], id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to restore'
        };
    }
}

/**
 * Restore multiple soft-deleted records
 */
export async function restoreBulk(
    entity: SoftDeleteEntity,
    ids: string[]
): Promise<RestoreResult> {
    try {
        const { error } = await tableQuery(entity)
            .update({ deleted_at: null })
            .in(ENTITY_KEY_COLUMN[entity], ids);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to bulk restore'
        };
    }
}

/**
 * Permanently delete a record (removes from database)
 */
export async function permanentDelete(
    entity: SoftDeleteEntity,
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await tableQuery(entity)
            .delete()
            .eq(ENTITY_KEY_COLUMN[entity], id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to permanently delete'
        };
    }
}

/**
 * Kolom owner (pemilik record) per entity untuk trash view.
 *
 * Hampir semua tabel memakai `user_id`; tabel yang TIDAK punya kolom owner
 * (`homework`, `announcements` — global/sekolah, tidak dimiliki per user)
 * bernilai `null` → entitas tsb di-SKIP dari trash view (tidak di-query).
 *
 * Sama seperti `ENTITY_KEY_COLUMN`: SELALU ambil kolom dari map ini, jangan
 * hardcode `'user_id'` — query yang menargetkan kolom yang tidak ada ditolak
 * PostgREST dengan HTTP 400 di runtime. Type `Record<SoftDeleteEntity, string | null>`
 * memaksa tiap entity baru terdaftar di sini (TS error kalau lupa).
 */
export const ENTITY_OWNER_COLUMN: Readonly<Record<SoftDeleteEntity, string | null>> = {
    students: 'user_id',
    classes: 'user_id',
    attendance: 'user_id',
    violations: 'user_id',
    quiz_points: 'user_id',
    academic_records: 'user_id',
    tasks: 'user_id',
    reports: 'user_id',
    schedules: 'user_id',
    communications: 'user_id',
    // homework & announcements: tidak punya kolom user_id (global/sekolah) → skip
    homework: null,
    extracurriculars: 'user_id',
    student_extracurriculars: 'user_id',
    extracurricular_attendance: 'user_id',
    extracurricular_grades: 'user_id',
    extracurricular_students: 'user_id',
    student_achievements: 'user_id',
    student_development_analyses: 'user_id',
    school_info: 'user_id',
    announcements: null,
    academic_years: 'user_id',
    semesters: 'user_id',
    user_settings: 'user_id',
};

/**
 * Get all soft-deleted items for trash view
 */
export async function getDeletedItems(
    entity: SoftDeleteEntity,
    userId: string
): Promise<DeletedItem[]> {
    // Entity tanpa kolom owner (homework/announcements) tidak bisa di-scope
    // per user → skip tanpa query (menghindari HTTP 400 dari PostgREST).
    const ownerColumn = ENTITY_OWNER_COLUMN[entity];
    if (!ownerColumn) {
        return [];
    }

    try {
        const { data, error } = await tableQuery(entity)
            .select('*')
            .eq(ownerColumn, userId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const RETENTION_DAYS = 30;

        return (data || [])
            .filter((item) => item.deleted_at !== null)
            .map((item) => {
                const deletedAt = new Date(item.deleted_at as string);
                const daysSinceDelete = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, RETENTION_DAYS - daysSinceDelete);

                return {
                    id: item[ENTITY_KEY_COLUMN[entity]] as string,
                    entity,
                    deletedAt: item.deleted_at as string,
                    daysRemaining,
                    data: item,
                };
            });
    } catch (error) {
        logger.error(`Failed to get deleted ${entity}`, error instanceof Error ? error : 'SoftDelete', error);
        return [];
    }
}

/**
 * Get all deleted items across all entities
 */
export const ALL_SOFT_DELETE_ENTITIES: SoftDeleteEntity[] = [
    'students', 'classes', 'attendance', 'tasks',
    'violations', 'quiz_points', 'academic_records',
    'reports', 'schedules', 'communications', 'homework',
    'extracurriculars', 'student_extracurriculars',
    'extracurricular_attendance', 'extracurricular_grades',
    'extracurricular_students', 'student_achievements',
    'student_development_analyses', 'school_info',
    'announcements', 'academic_years', 'semesters', 'user_settings',
];

export async function getAllDeletedItems(userId: string): Promise<DeletedItem[]> {
    const entities: SoftDeleteEntity[] = ALL_SOFT_DELETE_ENTITIES;

    const results = await Promise.all(
        entities.map(entity => getDeletedItems(entity, userId))
    );

    return results
        .flat()
        .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

/**
 * Kolom kunci (primary key) per entity untuk query batch cleanup.
 *
 * Hampir semua tabel memakai `id`; `user_settings` memakai `user_id`
 * (tanpa kolom `id` sama sekali). SELALU ambil kolom dari map ini —
 * jangan hardcode `'id'` — karena query yang menargetkan kolom yang tidak
 * ada di tabel ditolak PostgREST dengan HTTP 400 di runtime (kasus nyata:
 * 15× error konsol di semua halaman ber-guard, lihat docs/A11Y_LIGHTHOUSE_RESULTS.md).
 *
 * Type `Record<SoftDeleteEntity, string>` memaksa tiap entity baru yang
 * ditambahkan ke union `SoftDeleteEntity` juga terdaftar di sini (TS error
 * kalau lupa) — pola 400 seperti ini otomatis terhindar di masa depan.
 *
 * SELURUH API soft-delete memakai map ini sebagai kolom kunci (bukan
 * hardcode `'id'`): `softDelete`/`softDeleteBulk`/`restore`/`restoreBulk`/
 * `permanentDelete` (filter eq/in) dan `getDeletedItems` (memetakan
 * `item.id` dari kolom kunci). Dengan begitu `user_settings` bisa di-soft-
 * delete/restore/hapus-permanen memakai `user_id` dengan benar.
 */
export const ENTITY_KEY_COLUMN: Readonly<Record<SoftDeleteEntity, string>> = {
    students: 'id',
    classes: 'id',
    attendance: 'id',
    violations: 'id',
    quiz_points: 'id',
    academic_records: 'id',
    tasks: 'id',
    reports: 'id',
    schedules: 'id',
    communications: 'id',
    homework: 'id',
    extracurriculars: 'id',
    student_extracurriculars: 'id',
    extracurricular_attendance: 'id',
    extracurricular_grades: 'id',
    extracurricular_students: 'id',
    student_achievements: 'id',
    student_development_analyses: 'id',
    school_info: 'id',
    announcements: 'id',
    academic_years: 'id',
    semesters: 'id',
    // user_settings: primary key-nya `user_id` (bukan `id`)
    user_settings: 'user_id',
};

export async function cleanupExpired(): Promise<{
    success: boolean;
    deletedCounts: Record<string, number>;
    error?: string;
}> {
    const entities: SoftDeleteEntity[] = ALL_SOFT_DELETE_ENTITIES;
    const RETENTION_DAYS = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    const deletedCounts: Record<string, number> = Object.fromEntries(
        ALL_SOFT_DELETE_ENTITIES.map(e => [e, 0])
    );

    try {
        for (const entity of entities) {
            const keyColumn = ENTITY_KEY_COLUMN[entity];

            // First get items to delete (deleted_at < cutoff means they were deleted more than 30 days ago)
            // lt() filter on a date column automatically excludes null values
            const { data: itemsToDelete, error: selectError } = await tableQuery(entity)
                .select(keyColumn)
                .lt('deleted_at', cutoffISO);

            if (selectError) {
                logger.error(`Failed to query ${entity}`, new Error(selectError.message || 'Query failed'));
                continue;
            }

            if (!itemsToDelete || itemsToDelete.length === 0) {
                continue;
            }

            // Delete them by their key column (bukan hardcode 'id')
            const keys = itemsToDelete.map((item) => item[keyColumn] as string);
            const { error: deleteError } = await tableQuery(entity)
                .delete()
                .in(keyColumn, keys);

            if (deleteError) {
                logger.error(`Failed to delete ${entity}`, new Error(deleteError.message || 'Delete failed'));
                continue;
            }

            deletedCounts[entity] = keys.length;
        }

        return { success: true, deletedCounts };
    } catch (error) {
        return {
            success: false,
            deletedCounts,
            error: error instanceof Error ? error.message : 'Failed to cleanup expired records'
        };
    }
}

export default {
    softDelete,
    softDeleteBulk,
    restore,
    restoreBulk,
    permanentDelete,
    getDeletedItems,
    getAllDeletedItems,
    cleanupExpired,
};

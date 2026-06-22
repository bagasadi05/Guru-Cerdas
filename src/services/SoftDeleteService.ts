/**
 * Soft Delete Service
 * 
 * Provides soft delete functionality for all entities.
 * Records can be restored within 30 days before permanent deletion.
 */

import { supabase } from './supabase';
import { logger } from './logger';

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
    data: Record<string, any>;
}

/**
 * Soft delete a record by setting deleted_at timestamp
 */
export async function softDelete(
    entity: SoftDeleteEntity,
    id: string
): Promise<SoftDeleteResult> {
    try {
        const deletedAt = new Date().toISOString();

        const { error } = await (supabase
            .from(entity as any) as any)
            .update({ deleted_at: deletedAt } as never)
            .eq('id', id);

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

        const { error } = await (supabase
            .from(entity as any) as any)
            .update({ deleted_at: deletedAt } as never)
            .in('id', ids);

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
        const { error } = await (supabase
            .from(entity as any) as any)
            .update({ deleted_at: null } as never)
            .eq('id', id);

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
        const { error } = await (supabase
            .from(entity as any) as any)
            .update({ deleted_at: null } as never)
            .in('id', ids);

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
        const { error } = await (supabase
            .from(entity as any) as any)
            .delete()
            .eq('id', id);

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
 * Get all soft-deleted items for trash view
 */
export async function getDeletedItems(
    entity: SoftDeleteEntity,
    userId: string
): Promise<DeletedItem[]> {
    try {
        const { data, error } = await (supabase
            .from(entity as any) as any)
            .select('*')
            .eq('user_id', userId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const RETENTION_DAYS = 30;

        return (data || [])
            .filter((item: any) => (item as any).deleted_at !== null)
            .map((item: any) => {
                const deletedAt = new Date((item as any).deleted_at!);
                const daysSinceDelete = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, RETENTION_DAYS - daysSinceDelete);

                return {
                    id: (item as any).id,
                    entity,
                    deletedAt: (item as any).deleted_at as string,
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
 * Clean up expired soft-deleted records (older than 30 days)
 */
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
            // First get items to delete (deleted_at < cutoff means they were deleted more than 30 days ago)
            // lt() filter on a date column automatically excludes null values
            const { data: itemsToDelete, error: selectError } = await (supabase
                .from(entity as any) as any)
                .select('id')
                .lt('deleted_at', cutoffISO);

            if (selectError) {
                logger.error(`Failed to query ${entity}`, selectError);
                continue;
            }

            if (!itemsToDelete || itemsToDelete.length === 0) {
                continue;
            }

            // Delete them by ID
            const ids = itemsToDelete.map((item: any) => (item as any).id);
            const { error: deleteError } = await (supabase
                .from(entity as any) as any)
                .delete()
                .in('id', ids);

            if (deleteError) {
                logger.error(`Failed to delete ${entity}`, deleteError);
                continue;
            }

            deletedCounts[entity] = ids.length;
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

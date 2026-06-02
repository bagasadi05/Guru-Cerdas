/**
 * Undo Manager
 * 
 * Manages action history and provides undo functionality.
 * Actions expire after a configurable timeout (default 10 seconds for toast).
 */

import { supabase } from './supabase';
import { restore, restoreBulk, SoftDeleteEntity } from './SoftDeleteService';
import { logger } from './logger';

export type ActionType = 'create' | 'update' | 'delete' | 'bulk_delete';
export type StateRecord = Record<string, unknown>;

// P0 Fix: Whitelist entity yang diizinkan untuk undo operations
const ALLOWED_ENTITIES: readonly SoftDeleteEntity[] = [
    'students', 'classes', 'attendance', 'tasks',
    'violations', 'quiz_points', 'academic_records',
] as const;

export interface UndoableAction {
    id: string;
    userId: string;
    actionType: ActionType;
    entity: SoftDeleteEntity;
    entityIds: string[];
    previousState?: StateRecord[];
    createdAt: Date;
    expiresAt: Date;
    undone: boolean;
    description: string;
}

export interface ActionHistoryItem {
    id: string;
    actionType: ActionType;
    entity: SoftDeleteEntity;
    entityIds: string[];
    description: string;
    createdAt: Date;
    canUndo: boolean;
    previousState?: StateRecord[];
}

// In-memory action store (for quick access to recent undoable actions)
const recentActions: Map<string, UndoableAction> = new Map();

// P0 Fix: Track timer IDs untuk cleanup (mencegah memory leak)
const actionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Default timeout for undo actions (10 seconds)
const DEFAULT_UNDO_TIMEOUT_MS = 10000;

// Maximum actions to keep in history
const MAX_HISTORY_ITEMS = 50;

// P0 Fix: Batas fetch saat search aktif (mencegah fetch semua row ke memory)
const _MAX_SEARCH_FETCH = 500;

/**
 * Generate unique action ID
 * P0 Fix: Ganti Math.random dengan crypto.randomUUID
 */
function generateActionId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `action_${crypto.randomUUID()}`;
    }
    // Fallback untuk environment tanpa crypto.randomUUID
    return `action_${Date.now()}_${Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;
}

/**
 * Record an undoable action
 */
export async function recordAction(
    userId: string,
    actionType: ActionType,
    entity: SoftDeleteEntity,
    entityIds: string[],
    previousState?: StateRecord[],
    description?: string,
    timeoutMs: number = DEFAULT_UNDO_TIMEOUT_MS
): Promise<UndoableAction> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMs);
    // Database gets a longer undo window (30 days) to match soft delete retention
    const dbExpiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const action: UndoableAction = {
        id: generateActionId(),
        userId,
        actionType,
        entity,
        entityIds,
        previousState,
        createdAt: now,
        expiresAt,
        undone: false,
        description: description || generateDescription(actionType, entity, entityIds.length),
    };

    // Store in memory for quick access
    recentActions.set(action.id, action);

    // Store in database for persistence (using correct column names from schema)
    try {
        await supabase.from('action_history').insert({
            id: action.id,
            user_id: userId,
            action_type: actionType,
            entity_type: entity,
            affected_ids: entityIds,
            previous_state: (previousState as any) || null,
            expires_at: dbExpiresAt.toISOString(),
            can_undo: true,
            description: action.description,
        });
    } catch (error) {
        logger.error('Failed to persist action to database', error instanceof Error ? error : 'UndoManager', error);
        // Continue even if database insert fails - we still have in-memory record
    }

    // P0 Fix: Schedule cleanup after expiration — simpan timer ID untuk cleanup
    const timerId = setTimeout(() => {
        if (recentActions.has(action.id)) {
            const stored = recentActions.get(action.id);
            if (stored && !stored.undone) {
                recentActions.delete(action.id);
            }
        }
        actionTimers.delete(action.id);
    }, timeoutMs + 1000);
    actionTimers.set(action.id, timerId);

    // Cleanup old actions if exceeding limit
    cleanupOldActions();

    return action;
}

/**
 * Generate human-readable description for action
 */
function generateDescription(actionType: ActionType, entity: SoftDeleteEntity, count: number): string {
    const entityNames: Record<SoftDeleteEntity, { singular: string; plural: string }> = {
        students: { singular: 'siswa', plural: 'siswa' },
        classes: { singular: 'kelas', plural: 'kelas' },
        attendance: { singular: 'absensi', plural: 'absensi' },
        tasks: { singular: 'tugas', plural: 'tugas' },
        violations: { singular: 'pelanggaran', plural: 'pelanggaran' },
        quiz_points: { singular: 'poin keaktifan', plural: 'poin keaktifan' },
        academic_records: { singular: 'nilai', plural: 'nilai' },
    };

    const entityName = entityNames[entity]
        ? (count > 1 ? entityNames[entity].plural : entityNames[entity].singular)
        : String(entity);

    switch (actionType) {
        case 'delete':
            return `Menghapus ${count} ${entityName}`;
        case 'bulk_delete':
            return `Menghapus ${count} ${entityName}`;
        case 'update':
            return `Memperbarui ${count} ${entityName}`;
        case 'create':
            return `Membuat ${count} ${entityName}`;
        default:
            return `${actionType} ${count} ${entityName}`;
    }
}

/**
 * Undo an action by its ID
 * P0 Fix: Tambahkan currentUserId untuk authorization check
 */
export async function undo(actionId: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
    // Try to get from memory first
    let action = recentActions.get(actionId);

    // If not in memory, try database
    if (!action) {
        try {
            const { data, error } = await supabase
                .from('action_history')
                .select('*')
                .eq('id', actionId)
                .single();

            if (error || !data) {
                return { success: false, error: error?.message || 'Aksi tidak ditemukan' };
            }

            // Map database columns to our interface
            action = {
                id: data.id,
                userId: data.user_id,
                actionType: data.action_type as ActionType,
                entity: data.entity_type as SoftDeleteEntity,
                entityIds: data.affected_ids || [],
                previousState: (data.previous_state as StateRecord[]) || undefined,
                createdAt: new Date(data.created_at || 0),
                expiresAt: new Date(data.expires_at ?? 0),
                undone: !(data.can_undo ?? true), // can_undo is the inverse of undone
                description: data.description || generateDescription(
                    data.action_type as ActionType,
                    data.entity_type as SoftDeleteEntity,
                    (data.affected_ids || []).length
                ),
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Gagal mengambil data aksi'
            };
        }
    }

    // Check if already undone
    if (action.undone) {
        return { success: false, error: 'Aksi sudah di-undo' };
    }

    // P0 Fix: Authorization — verifikasi user yang undo adalah pemilik action
    if (currentUserId && action.userId !== currentUserId) {
        return { success: false, error: 'Tidak diizinkan: aksi ini milik user lain' };
    }

    // P0 Fix: Whitelist entity validation — cegah write ke tabel arbitrary
    if (!ALLOWED_ENTITIES.includes(action.entity)) {
        return { success: false, error: `Entity "${action.entity}" tidak valid untuk undo` };
    }

    // Check if expired
    if (new Date() > action.expiresAt) {
        return { success: false, error: 'Waktu undo telah habis' };
    }

    // Perform the undo based on action type
    try {
        switch (action.actionType) {
            case 'delete':
            case 'bulk_delete':
                // Restore soft-deleted items
                if (action.entityIds.length === 1) {
                    const result = await restore(action.entity, action.entityIds[0]);
                    if (!result.success) {
                        return { success: false, error: result.error };
                    }
                } else {
                    const result = await restoreBulk(action.entity, action.entityIds);
                    if (!result.success) {
                        return { success: false, error: result.error };
                    }
                }
                break;

            case 'update':
                // Restore previous state
                if (action.previousState && action.previousState.length > 0) {
                    for (let i = 0; i < action.entityIds.length; i++) {
                        const id = action.entityIds[i];
                        const prevState = action.previousState[i];
                        if (prevState) {
                            await supabase
                                .from(action.entity)
                                .update(prevState as never)
                                .eq('id', id);
                        }
                    }
                }
                break;

            case 'create':
                // Delete created items (soft delete)
                for (const id of action.entityIds) {
                    await supabase
                        .from(action.entity)
                        .update({ deleted_at: new Date().toISOString() } as never)
                        .eq('id', id);
                }
                break;
        }

        // Mark action as undone
        action.undone = true;
        recentActions.set(actionId, action);

        // Update database (can_undo = false means undone)
        await supabase
            .from('action_history')
            .update({ can_undo: false })
            .eq('id', actionId);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal membatalkan aksi'
        };
    }
}

/**
 * Get action history for a user
 */
export interface ActionHistoryFilters {
    type?: ActionType | 'all';
    entity?: SoftDeleteEntity | 'all';
    startDate?: string;
    endDate?: string;
    search?: string;
}

/**
 * Get action history for a user with filters
 * P0 Fix: Gunakan .range() di server saat tidak ada search, limit fetch saat ada search
 */
export async function getActionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    filters: ActionHistoryFilters = {}
): Promise<{ items: ActionHistoryItem[]; total: number }> {
    try {
        const normalizedSearch = filters.search?.trim().toLowerCase();

        let query = supabase
            .from('action_history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.type && filters.type !== 'all') {
            query = query.eq('action_type', filters.type);
        }

        if (filters.entity && filters.entity !== 'all') {
            query = query.eq('entity_type', filters.entity);
        }

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }

        if (filters.endDate) {
            // Add 1 day to include the end date fully
            const nextDay = new Date(filters.endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            query = query.lt('created_at', nextDay.toISOString());
        }

        const now = new Date();

        // Server-side text search with fallbacks for older records
        if (normalizedSearch) {
            const orConditions: string[] = [`description.ilike.%${normalizedSearch}%`];
            
            // Map common Indonesian terms to database entity types
            const entityMap: Record<string, string> = {
                siswa: 'students', murid: 'students', student: 'students',
                kelas: 'classes', class: 'classes',
                absen: 'attendance', kehadiran: 'attendance', attendance: 'attendance',
                tugas: 'tasks', task: 'tasks',
                pelanggaran: 'violations', violation: 'violations',
                poin: 'quiz_points', keaktifan: 'quiz_points', quiz: 'quiz_points',
                nilai: 'academic_records', academic: 'academic_records'
            };
            
            // Map common Indonesian terms to database action types
            const actionMap: Record<string, string[]> = {
                hapus: ['delete', 'bulk_delete'],
                delete: ['delete', 'bulk_delete'],
                ubah: ['update'],
                perbarui: ['update'],
                edit: ['update'],
                update: ['update'],
                buat: ['create'],
                tambah: ['create'],
                create: ['create']
            };

            for (const [key, val] of Object.entries(entityMap)) {
                if (key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
                    orConditions.push(`entity_type.eq.${val}`);
                }
            }

            for (const [key, val] of Object.entries(actionMap)) {
                if (key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
                    val.forEach(act => {
                        orConditions.push(`action_type.eq.${act}`);
                    });
                }
            }

            query = query.or(orConditions.join(','));
        }

        // Fetch paginated range directly from Supabase (efficient, no client-side truncation)
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;

        if (error) throw error;

        const items = (data || []).map(item => ({
            id: item.id,
            actionType: item.action_type as ActionType,
            entity: item.entity_type as SoftDeleteEntity,
            entityIds: item.affected_ids || [],
            description: item.description || generateDescription(
                item.action_type as ActionType,
                item.entity_type as SoftDeleteEntity,
                (item.affected_ids || []).length
            ),
            createdAt: new Date(item.created_at || 0),
            canUndo: (item.can_undo || false) && new Date(item.expires_at ?? 0) > now,
            previousState: (item.previous_state as StateRecord[]) || undefined,
        }));

        return { items, total: count || 0 };
    } catch (error) {
        logger.error('Failed to get action history', error instanceof Error ? error : 'UndoManager', error);
        return { items: [], total: 0 };
    }
}

/**
 * Check if an action can still be undone
 */
export function canUndo(actionId: string): boolean {
    const action = recentActions.get(actionId);
    if (!action) return false;
    return !action.undone && new Date() <= action.expiresAt;
}

/**
 * Get remaining time to undo an action (in milliseconds)
 */
export function getUndoTimeRemaining(actionId: string): number {
    const action = recentActions.get(actionId);
    if (!action || action.undone) return 0;

    const remaining = action.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
}

/**
 * Clear old actions from memory
 * P0 Fix: Juga bersihkan timer yang terkait
 */
export function cleanupOldActions(): void {
    const now = Date.now();
    const expiredThreshold = now - (60 * 60 * 1000); // 1 hour ago

    for (const [id, action] of recentActions) {
        if (action.createdAt.getTime() < expiredThreshold) {
            recentActions.delete(id);
            // Bersihkan timer terkait
            const timer = actionTimers.get(id);
            if (timer) {
                clearTimeout(timer);
                actionTimers.delete(id);
            }
        }
    }

    // Also enforce max history limit
    if (recentActions.size > MAX_HISTORY_ITEMS) {
        const sortedActions = Array.from(recentActions.entries())
            .sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime());

        const toDelete = sortedActions.slice(MAX_HISTORY_ITEMS);
        toDelete.forEach(([id]) => {
            recentActions.delete(id);
            const timer = actionTimers.get(id);
            if (timer) {
                clearTimeout(timer);
                actionTimers.delete(id);
            }
        });
    }
}

/**
 * Clear all action history for a user
 */
export async function clearHistory(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('action_history')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        // Clear from memory too
        for (const [id, action] of recentActions) {
            if (action.userId === userId) {
                recentActions.delete(id);
            }
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal menghapus history'
        };
    }
}

/**
 * Clean up expired actions from database
 */
export async function cleanupExpiredActions(): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep for 7 days

        // First get count
        const { count } = await supabase
            .from('action_history')
            .select('*', { count: 'exact', head: true })
            .lt('expires_at', cutoffDate.toISOString());

        // Then delete
        const { error } = await supabase
            .from('action_history')
            .delete()
            .lt('expires_at', cutoffDate.toISOString());

        if (error) throw error;

        return { success: true, deleted: count || 0 };
    } catch (error) {
        return {
            success: false,
            deleted: 0,
            error: error instanceof Error ? error.message : 'Gagal cleanup expired actions'
        };
    }
}

export default {
    recordAction,
    undo,
    getActionHistory,
    canUndo,
    getUndoTimeRemaining,
    clearHistory,
    cleanupExpiredActions,
};

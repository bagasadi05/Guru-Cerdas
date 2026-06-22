import { supabase } from './supabase';
import { Database } from './database.types';

type DeletionAuditRow = Database['public']['Tables']['deletion_audit']['Row'];

export interface DeletionAuditStats {
    totalDeleted: number;
    totalRestored: number;
    perTable: Record<string, { deleted: number; restored: number }>;
    recentDeletions: DeletionAuditRow[];
}

export async function getDeletionAudit(params?: {
    tableName?: string;
    limit?: number;
    offset?: number;
    onlyRestored?: boolean;
    onlyUnrestored?: boolean;
}): Promise<{ data: DeletionAuditRow[]; count: number }> {
    let query = supabase
        .from('deletion_audit')
        .select('*', { count: 'exact' })
        .order('deleted_at', { ascending: false });

    if (params?.tableName) {
        query = query.eq('table_name', params.tableName);
    }

    if (params?.onlyRestored) {
        query = query.not('restored_at', 'is', null);
    }

    if (params?.onlyUnrestored) {
        query = query.is('restored_at', null);
    }

    if (params?.limit) {
        query = query.range(
            params.offset ?? 0,
            (params.offset ?? 0) + params.limit - 1
        );
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Failed to fetch deletion audit:', error);
        return { data: [], count: 0 };
    }

    return { data: data ?? [], count: count ?? 0 };
}

export async function getDeletionAuditStats(): Promise<DeletionAuditStats> {
    const { data, count } = await getDeletionAudit({ limit: 100 });

    const perTable: Record<string, { deleted: number; restored: number }> = {};
    let totalRestored = 0;

    for (const record of data) {
        if (!perTable[record.table_name]) {
            perTable[record.table_name] = { deleted: 0, restored: 0 };
        }
        perTable[record.table_name].deleted++;
        if (record.restored_at) {
            perTable[record.table_name].restored++;
            totalRestored++;
        }
    }

    return {
        totalDeleted: count,
        totalRestored,
        perTable,
        recentDeletions: data.slice(0, 10),
    };
}

export async function restoreFromAudit(
    tableName: string,
    recordId: string
): Promise<boolean> {
    // Reconstruct the original data from the snapshot
    const { data: auditRecord, error: fetchError } = await supabase
        .from('deletion_audit')
        .select('row_snapshot')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .is('restored_at', null)
        .order('deleted_at', { ascending: false })
        .limit(1)
        .single();

    if (fetchError || !auditRecord?.row_snapshot) {
        console.error('No snapshot found for restoration:', fetchError);
        return false;
    }

    const snapshot = auditRecord.row_snapshot as Record<string, unknown>;
    // Remove deleted_at to restore
    delete snapshot.deleted_at;

    const { error: updateError } = await (supabase
        .from(tableName as any) as any)
        .update(snapshot)
        .eq('id', recordId);

    if (updateError) {
        console.error('Failed to restore from audit:', updateError);
        return false;
    }

    return true;
}

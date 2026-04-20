import { supabase } from './supabase';
import { Database } from './database.types';

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export type AuditTrailAction = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuditTrailData = Record<string, unknown> | null;

export async function writeAuditLog(params: {
    userId: string | null;
    userEmail?: string | null;
    tableName: string;
    recordId: string;
    action: AuditTrailAction;
    oldData?: AuditTrailData;
    newData?: AuditTrailData;
}) {
    try {
        const payload: AuditLogInsert = {
            user_id: params.userId,
            user_email: params.userEmail || null,
            table_name: params.tableName,
            record_id: params.recordId,
            action: params.action,
            old_data: (params.oldData || null) as AuditLogInsert['old_data'],
            new_data: (params.newData || null) as AuditLogInsert['new_data'],
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        };

        const { error } = await supabase.from('audit_logs').insert(payload);
        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
}

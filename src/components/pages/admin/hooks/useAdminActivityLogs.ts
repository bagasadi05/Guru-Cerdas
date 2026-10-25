import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import type { AuditLog } from '../types';
import { LOG_PAGE_SIZE, sanitizeSearchTerm } from '../utils';

interface UseAdminActivityLogsOptions {
    userId?: string;
    userEmail?: string | null;
}

export const useAdminActivityLogs = ({ userId, userEmail }: UseAdminActivityLogsOptions) => {
    const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logSearchTerm, setLogSearchTerm] = useState('');
    const [debouncedLogSearchTerm, setDebouncedLogSearchTerm] = useState('');
    const [logPage, setLogPage] = useState(1);
    const [logTotal, setLogTotal] = useState(0);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedLogSearchTerm(logSearchTerm.trim()), 300);
        return () => clearTimeout(handle);
    }, [logSearchTerm]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
        if (logPage > pageCount) {
            setLogPage(pageCount);
        }
    }, [logTotal, logPage]);

    const fetchActivityLogs = useCallback(async () => {
        setLogsLoading(true);
        const safeSearch = sanitizeSearchTerm(debouncedLogSearchTerm);
        const logFrom = (logPage - 1) * LOG_PAGE_SIZE;
        const logTo = logFrom + LOG_PAGE_SIZE - 1;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = (supabase as any)
                .from('audit_logs')
                .select('id, created_at, user_email, table_name, action, record_id, old_data, new_data', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (safeSearch) {
                query = query.or(
                    `user_email.ilike.%${safeSearch}%,action.ilike.%${safeSearch}%,table_name.ilike.%${safeSearch}%,record_id.ilike.%${safeSearch}%`
                );
            }

            const { data, error, count } = await query.range(logFrom, logTo);
            if (error) throw error;
            setActivityLogs(data || []);
            setLogTotal(count || 0);
        } catch (err) {
            console.error('Activity logs fetch error:', err);
            setActivityLogs([]);
            setLogTotal(0);
        } finally {
            setLogsLoading(false);
        }
    }, [debouncedLogSearchTerm, logPage]);

    const logAdminAction = useCallback(
        async (tableName: string, action: string, recordId: string, oldData?: unknown, newData?: unknown) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any).from('audit_logs').insert({
                    user_id: userId,
                    user_email: userEmail,
                    table_name: tableName,
                    action: action,
                    record_id: recordId,
                    old_data: oldData ? oldData : null,
                    new_data: newData ? newData : null,
                });
            } catch (err) {
                console.error('Failed to log action:', err);
            }
        },
        [userId, userEmail]
    );

    return {
        activityLogs,
        logsLoading,
        logSearchTerm,
        setLogSearchTerm,
        logPage,
        setLogPage,
        logTotal,
        fetchActivityLogs,
        logAdminAction,
    };
};

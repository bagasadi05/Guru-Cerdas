import { useState, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import type { SystemHealth } from '../types';

export const useAdminSystemHealth = () => {
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({
        database: 'healthy',
        api: 'healthy',
        lastChecked: null,
        databaseLatencyMs: null,
        apiLatencyMs: null,
    });

    const checkSystemHealth = useCallback(async () => {
        try {
            const dbStart = Date.now();
            const { error: dbError } = await supabase.from('user_roles').select('user_id').limit(1);
            const dbLatency = Date.now() - dbStart;

            const apiStart = Date.now();
            const { error: apiError } = await supabase.auth.getSession();
            const apiLatency = Date.now() - apiStart;

            setSystemHealth({
                database: dbError ? 'down' : dbLatency > 1000 ? 'degraded' : 'healthy',
                api: apiError ? 'down' : apiLatency > 1000 ? 'degraded' : 'healthy',
                lastChecked: new Date(),
                databaseLatencyMs: dbLatency,
                apiLatencyMs: apiLatency,
            });
        } catch {
            setSystemHealth((prev) => ({
                ...prev,
                database: 'down',
                api: 'down',
                lastChecked: new Date(),
                databaseLatencyMs: null,
                apiLatencyMs: null,
            }));
        }
    }, []);

    return {
        systemHealth,
        checkSystemHealth,
    };
};

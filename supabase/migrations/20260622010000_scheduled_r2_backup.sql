-- F13-2: Automated daily backup to Cloudflare R2
-- Uses pg_cron + pg_net to invoke the scheduled-backup Edge Function daily

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create a backup log table to track scheduled backup runs
CREATE TABLE IF NOT EXISTS backup_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running', -- running, success, failed
    backup_key TEXT,
    total_rows INTEGER DEFAULT 0,
    tables_count INTEGER DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on backup_runs
ALTER TABLE backup_runs ENABLE ROW LEVEL SECURITY;

-- Admin can see all backup runs
CREATE POLICY "Admin can view backup runs" ON backup_runs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Only service role can insert/update backup runs
CREATE POLICY "Service role manages backup runs" ON backup_runs
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Create function to call the scheduled-backup Edge Function
CREATE OR REPLACE FUNCTION invoke_scheduled_backup()
RETURNS void AS $$
DECLARE
    supabase_url TEXT;
    backup_secret TEXT;
    response_id BIGINT;
BEGIN
    -- Get Supabase URL from current settings
    supabase_url := current_setting('app.settings.supabase_url', true);
    
    -- Fallback: try to get from environment (may not be available)
    IF supabase_url IS NULL OR supabase_url = '' THEN
        supabase_url := 'https://fddvcyqbfqydvsfujcxd.supabase.co';
    END IF;

    backup_secret := current_setting('app.settings.scheduled_backup_secret', true);

    -- Log the backup attempt
    INSERT INTO backup_runs (status, metadata) 
    VALUES ('running', jsonb_build_object('trigger', 'pg_cron'));

    -- Call the Edge Function via pg_net
    response_id := net.http_post(
        url := supabase_url || '/functions/v1/scheduled-backup',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Internal-Secret', COALESCE(backup_secret, '')
        ),
        body := '{}'::jsonb
    );

    RAISE NOTICE 'Scheduled backup invoked, pg_net response ID: %', response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule the backup to run daily at 2:00 AM WIB (UTC+7 = 19:00 UTC previous day)
SELECT cron.schedule(
    'daily-r2-backup',           -- job name
    '0 19 * * *',                -- cron expression: 19:00 UTC = 02:00 WIB
    $$SELECT invoke_scheduled_backup()$$
);

-- 5. Function to get backup run history
CREATE OR REPLACE FUNCTION get_backup_runs(
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT,
    backup_key TEXT,
    total_rows INTEGER,
    tables_count INTEGER,
    size_bytes BIGINT,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        br.id,
        br.started_at,
        br.completed_at,
        br.status,
        br.backup_key,
        br.total_rows,
        br.tables_count,
        br.size_bytes,
        br.error_message
    FROM backup_runs br
    ORDER BY br.started_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON backup_runs TO service_role;
GRANT EXECUTE ON FUNCTION invoke_scheduled_backup() TO service_role;
GRANT EXECUTE ON FUNCTION get_backup_runs(INTEGER) TO service_role;

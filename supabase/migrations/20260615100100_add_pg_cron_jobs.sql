-- Migration: Enable pg_cron + pg_net, register scheduled dispatcher job
-- This migration is idempotent and safe to re-run

-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Ensure a stored config for the dispatcher URL
-- Replace these values when deploying:
--   <PROJECT_REF>  -> your Supabase project ref (e.g. abcdefghijkl)
--   <SERVICE_KEY>  -> your service_role key (kept in Supabase secrets, not in SQL)
--
-- We avoid hardcoding secrets here; the URL is set via Supabase Edge Function secret
-- SUPABASE_URL and a runtime function reads it via getenv().

-- Drop existing job if present (idempotent)
select cron.unschedule('dispatch-push-hourly') where exists (
  select 1 from cron.job where jobname = 'dispatch-push-hourly'
);

-- Schedule dispatcher: every hour at minute 5
-- The Edge Function reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
select cron.schedule(
  'dispatch-push-hourly',
  '5 * * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.dispatch_push_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.dispatch_push_service_key', true)
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'triggeredAt', now()
      ),
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);

-- Optional: a more frequent dispatcher for task-due reminders (every 15 minutes)
select cron.unschedule('dispatch-push-quarterly') where exists (
  select 1 from cron.job where jobname = 'dispatch-push-quarterly'
);

select cron.schedule(
  'dispatch-push-quarterly',
  '*/15 * * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.dispatch_push_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.dispatch_push_service_key', true)
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'mode', 'task-due-check',
        'triggeredAt', now()
      ),
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);

-- Stored procedure to update runtime config (called by admin or migration runner)
create or replace function public.set_dispatch_push_config(
  p_url text,
  p_service_key text
) returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.dispatch_push_url', p_url, false);
  perform set_config('app.dispatch_push_service_key', p_service_key, false);
  -- Note: set_config with false sets it for the current transaction only.
  -- For persistent storage, use ALTER DATABASE or Supabase Vault.
  -- Here we assume admin will run ALTER DATABASE manually post-deploy, e.g.:
  --   ALTER DATABASE postgres SET app.dispatch_push_url = 'https://<ref>.supabase.co/functions/v1/dispatch-push';
  --   ALTER DATABASE postgres SET app.dispatch_push_service_key = '<service_role_key>';
end;
$$;

comment on function public.set_dispatch_push_config is
  'Helper to set dispatch URL and service key. For production, prefer ALTER DATABASE SET.';

-- 20260812000001_schedule_daily_report.sql
-- pg_cron job yang memanggil Edge Function daily-report setiap sore.
-- Jam pengiriman dikonfigurasi via app_config key 'daily_report_schedule'.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Set jam default: 17:00 WIB = 10:00 UTC
-- URL Edge Function akan otomatis dibangun dari SUPABASE_URL di Edge Function,
-- tapi kita simpan juga sebagai reference. Isi manual via set_app_config atau
-- biarkan cron job membaca dari app_config.
insert into public.app_config (key, value) values
  ('daily_report_schedule', '0 10 * * *'),
  ('daily_report_function_url', '')
on conflict (key) do nothing;

-- URL function dan service_key harus diisi via set_app_config setelah deploy:
--   SELECT set_app_config('daily_report_function_url', 'https://<ref>.supabase.co/functions/v1/daily-report');
--   (service_key pakai yang sama dengan modul_ajar_worker_service_key — shared secret)
-- Jika belum ada, cron akan skip karena WHERE clause memeriksa nilai tidak kosong.

-- Drop existing if rescheduling
select cron.unschedule('daily-report') where exists (
  select 1 from cron.job where jobname = 'daily-report'
);

select cron.schedule(
  'daily-report',
  coalesce(public.get_app_config('daily_report_schedule'), '0 10 * * *'),
  $$
  select
    net.http_post(
      url := coalesce(public.get_app_config('daily_report_function_url'), ''),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(public.get_app_config('modul_ajar_worker_service_key'), '')
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'triggeredAt', now()
      ),
      timeout_milliseconds := 30000
    ) as request_id
    where coalesce(public.get_app_config('daily_report_function_url'), '') <> ''
      and coalesce(public.get_app_config('modul_ajar_worker_service_key'), '') <> '';
  $$
);

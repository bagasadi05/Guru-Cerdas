-- 20260812000004_daily_input_log_retention.sql
--
-- Kebijakan retensi daily_input_log: hapus otomatis log yang lebih tua dari
-- 30 hari (dikonfigurasi via app_config 'daily_input_log_retention_days')
-- agar tabel tidak membesar tanpa batas.
--
-- Laporan harian (Edge Function daily-report) hanya membaca log hari berjalan
-- (batas WIB), jadi log lama tidak pernah dibutuhkan lagi — aman dihapus.
--
-- Idempotent.

-- =========================================================
-- 1. Fungsi pembersih
-- =========================================================
-- SECURITY DEFINER agar melewati RLS (tabel daily_input_log tidak punya policy
-- DELETE/UPDATE untuk user biasa). Di-gate: hanya admin / service_role / postgres.
create or replace function public.cleanup_daily_input_logs(p_retention_days int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if not (
    public.is_admin_user(auth.uid())
    or auth.role() = 'service_role'
    or session_user = 'postgres'
  ) then
    raise exception 'Forbidden: hanya admin yang dapat membersihkan log input';
  end if;

  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'retention_days harus >= 1, dapat: %', p_retention_days;
  end if;

  with deleted as (
    delete from public.daily_input_log
    where created_at < now() - make_interval(days => p_retention_days)
    returning id
  )
  select count(*) into v_deleted from deleted;

  return v_deleted;
end;
$$;

grant execute on function public.cleanup_daily_input_logs(int) to authenticated;

-- =========================================================
-- 2. Konfigurasi retensi (boleh di-override via set_app_config)
-- =========================================================
insert into public.app_config (key, value)
values ('daily_input_log_retention_days', '30')
on conflict (key) do nothing;

-- =========================================================
-- 3. Cron harian: pembersihan tiap hari 02:00 UTC (09:00 WIB)
-- =========================================================
select cron.unschedule('daily-input-log-cleanup') where exists (
  select 1 from cron.job where jobname = 'daily-input-log-cleanup'
);

select cron.schedule(
  'daily-input-log-cleanup',
  '0 2 * * *',
  $$
  select public.cleanup_daily_input_logs(
    coalesce(nullif(public.get_app_config('daily_input_log_retention_days'), ''), '30')::int
  );
  $$
);

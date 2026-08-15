-- 20260812000003_fix_daily_report_wiring_and_secure_app_config.sql
--
-- Perbaikan untuk fitur laporan harian (commit 246552e2):
-- 1. Cron pg_cron sekarang mengirim header X-Internal-Secret (pola yang sama
--    dengan scheduled-backup), bukan Authorization yang memakai service key —
--    sebelumnya setiap pemanggilan terjadwal pasti ditolak 401 oleh Edge Function.
-- 2. daily_report_function_url diisi default supaya fitur jalan out-of-the-box
--    (sebelumnya '' sehingga cron melewati pemanggilan tanpa ada yang mengisi).
-- 3. Secret worker disimpan di app_config ('daily_report_worker_secret') dan
--    dibaca dua sisi (cron + Edge Function) — tidak butuh konfigurasi dashboard.
-- 4. RPC set_daily_report_schedule(p_time WIB) untuk picker "Jam Pengiriman"
--    di UI admin: mengubah jadwal cron secara langsung, bukan cuma label.
-- 5. set_app_config / get_app_config / get_telegram_config kini di-gate: hanya
--    admin, service_role, atau sesi postgres (cron/SQL editor) — mencegah user
--    biasa menimpa config global atau membaca modul_ajar_worker_service_key
--    (JWT tersimpan) / chat ID admin.
--
-- Idempotent.

-- =========================================================
-- 1. Amankan RPC set/get app_config
-- =========================================================
-- Sebelumnya: security definer tanpa gate — user authenticated mana pun bisa
-- menimpa/membaca semua key (termasuk secret JWT worker). Sekarang: admin
-- (via JWT user) atau service_role (Edge Function) atau sesi postgres (cron).
-- Catatan: gunakan `session_user` (bukan `current_user`) — di dalam fungsi
-- security definer, `current_user` selalu definer (postgres) sehingga gate
-- tidak pernah menolak siapa pun.
create or replace function public.set_app_config(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin_user(auth.uid())
    or auth.role() = 'service_role'
    or session_user = 'postgres'
  ) then
    raise exception 'Forbidden: hanya admin yang dapat mengubah konfigurasi aplikasi';
  end if;

  insert into public.app_config (key, value)
  values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
end;
$$;

create or replace function public.get_app_config(p_key text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select value
  from public.app_config
  where key = p_key
    and (
      public.is_admin_user(auth.uid())
      or auth.role() = 'service_role'
      or session_user = 'postgres'
    );
$$;

grant execute on function public.set_app_config(text, text) to authenticated;
grant execute on function public.get_app_config(text) to authenticated;

-- get_telegram_config: baca config Telegram global — hanya untuk admin
-- (tab Telegram), service_role, atau postgres. Dipakai satu-satunya oleh
-- useTelegramConfig yang di-mount di halaman admin.
create or replace function public.get_telegram_config()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select value::jsonb
      from public.app_config
      where key = 'telegram_config'
        and (
          public.is_admin_user(auth.uid())
          or auth.role() = 'service_role'
          or session_user = 'postgres'
        )
    ),
    '{}'::jsonb
  );
$$;

grant execute on function public.get_telegram_config() to authenticated;

-- =========================================================
-- 2. Konfigurasi default laporan harian
-- =========================================================
-- URL function: pakai ref project yang sama dengan migration modul-ajar.
-- Kalau key sudah terisi (non-kosong), jangan timpa (boleh di-override manual).
insert into public.app_config (key, value)
values (
  'daily_report_function_url',
  'https://fddvcyqbfqydvsfujcxd.supabase.co/functions/v1/daily-report'
)
on conflict (key) do update set value = excluded.value
where public.app_config.value is null or public.app_config.value = '';

-- Secret internal untuk memanggil Edge Function dari pg_cron.
-- Dibuat random sekali; kalau sudah ada, dipertahankan (jangan rotasi diam-diam).
insert into public.app_config (key, value)
values (
  'daily_report_worker_secret',
  md5(random()::text || clock_timestamp()::text)
)
on conflict (key) do nothing;

-- =========================================================
-- 3. Reschedule cron job daily-report (idempotent)
-- =========================================================
create or replace function public.reschedule_daily_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expr text;
begin
  v_expr := coalesce(
    (select value from public.app_config where key = 'daily_report_schedule'),
    '0 10 * * *'
  );

  perform cron.unschedule('daily-report')
    where exists (select 1 from cron.job where jobname = 'daily-report');

  -- Header X-Internal-Secret (pola scheduled-backup) — bukan Authorization.
  -- Cron skip bila URL/secret belum terisi.
  perform cron.schedule(
    'daily-report',
    v_expr,
    $cmd$
    select
      net.http_post(
        url := coalesce(public.get_app_config('daily_report_function_url'), ''),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Internal-Secret', coalesce(public.get_app_config('daily_report_worker_secret'), '')
        ),
        body := jsonb_build_object(
          'source', 'pg_cron',
          'triggeredAt', now()
        ),
        timeout_milliseconds := 30000
      ) as request_id
      where coalesce(public.get_app_config('daily_report_function_url'), '') <> ''
        and coalesce(public.get_app_config('daily_report_worker_secret'), '') <> '';
    $cmd$
  );
end;
$$;

-- =========================================================
-- 4. RPC untuk picker "Jam Pengiriman" di UI admin
-- =========================================================
-- Menerima waktu WIB 'HH:MM', konversi ke ekspresi cron UTC (WIB = UTC+7),
-- simpan ke app_config 'daily_report_schedule', lalu reschedule job.
create or replace function public.set_daily_report_schedule(p_time text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour int;
  v_min int;
  v_utc_hour int;
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Forbidden: hanya admin yang dapat mengubah jadwal laporan harian';
  end if;

  if p_time is null or not (p_time ~ '^\d{1,2}:\d{2}$') then
    raise exception 'Waktu tidak valid: %', p_time;
  end if;

  v_hour := split_part(p_time, ':', 1)::int;
  v_min := split_part(p_time, ':', 2)::int;

  if v_hour not between 0 and 23 or v_min not between 0 and 59 then
    raise exception 'Waktu tidak valid: %', p_time;
  end if;

  v_utc_hour := (v_hour - 7 + 24) % 24;

  insert into public.app_config (key, value)
  values ('daily_report_schedule', format('%s %s * * *', v_min, v_utc_hour))
  on conflict (key) do update set value = excluded.value;

  perform public.reschedule_daily_report();
end;
$$;

grant execute on function public.set_daily_report_schedule(text) to authenticated;

-- =========================================================
-- 5. Terapkan sekarang
-- =========================================================
select public.reschedule_daily_report();

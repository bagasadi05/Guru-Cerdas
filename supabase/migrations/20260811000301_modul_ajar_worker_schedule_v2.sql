-- 20260811000301_modul_ajar_worker_schedule_v2.sql
--
-- Pengganti 20260811000300: cron worker AI membaca konfigurasi dari TABEL
-- (bukan custom GUC app.*). Custom GUC cuma bisa di-set oleh superuser via
-- dashboard SQL editor — menyulitkan deploy otomatis. Tabel bisa diisi oleh
-- siapa pun dengan akses, dan cron (security definer) membacanya.
--
-- Sifat: IDEMPOTENT.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =========================================
-- 1. Tabel konfigurasi
-- =========================================
create table if not exists public.app_config (
  key text primary key,
  value text not null
);

-- RLS ketat: hanya admin yang boleh baca/tulis tabel langsung; cron memakai
-- get_app_config (security definer) yang melewati RLS sebagai postgres.
alter table public.app_config enable row level security;

drop policy if exists "app_config read" on public.app_config;
create policy "app_config read" on public.app_config
  for select to authenticated using (public.is_admin_user(auth.uid()));

drop policy if exists "app_config admin write" on public.app_config;
create policy "app_config admin write" on public.app_config
  for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

-- =========================================
-- 2. Helper set/get (security definer agar aman dibaca cron)
-- =========================================
create or replace function public.set_app_config(p_key text, p_value text)
returns void
language plpgsql
security definer
as $$
begin
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
as $$
  select value from public.app_config where key = p_key;
$$;

-- =========================================
-- 3. Isi konfigurasi default (URL worker — service key di-set terpisah
--    karena secret; diisi via set_app_config oleh admin/deploy)
-- =========================================
insert into public.app_config (key, value) values
  ('modul_ajar_worker_url', 'https://fddvcyqbfqydvsfujcxd.supabase.co/functions/v1/modul-ajar-ai-worker'),
  ('modul_ajar_worker_service_key', '')
on conflict (key) do nothing;

-- =========================================
-- 4. Cron job — baca dari tabel via get_app_config
-- =========================================
select cron.unschedule('modul-ajar-ai-worker-poll') where exists (
  select 1 from cron.job where jobname = 'modul-ajar-ai-worker-poll'
);

select cron.schedule(
  'modul-ajar-ai-worker-poll',
  '*/2 * * * *',
  $$
  select
    net.http_post(
      url := public.get_app_config('modul_ajar_worker_url'),
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
    where public.get_app_config('modul_ajar_worker_service_key') <> '';
  $$
);

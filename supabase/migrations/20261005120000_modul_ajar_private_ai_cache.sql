create table public.modul_ajar_ai_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (length(operation) between 1 and 80),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  prompt_version integer not null,
  contract_version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  primary key (user_id, operation, request_fingerprint),
  check (expires_at > created_at and expires_at <= created_at + interval '7 days')
);
create index modul_ajar_ai_cache_expiry on public.modul_ajar_ai_cache(expires_at);
alter table public.modul_ajar_ai_cache enable row level security;
create policy cache_owner_read on public.modul_ajar_ai_cache for select to authenticated using ((select auth.uid()) = user_id);
create policy cache_owner_insert on public.modul_ajar_ai_cache for insert to authenticated with check ((select auth.uid()) = user_id);
create policy cache_owner_update on public.modul_ajar_ai_cache for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cache_owner_delete on public.modul_ajar_ai_cache for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.modul_ajar_ai_cache from anon;
grant select, insert, update, delete on public.modul_ajar_ai_cache to authenticated;
grant all on public.modul_ajar_ai_cache to service_role;

create table public.modul_ajar_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (length(operation) between 1 and 80),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  cache_hit boolean not null,
  status text not null check (status in ('completed', 'failed', 'cancelled')),
  attempts jsonb not null default '[]'::jsonb check (jsonb_typeof(attempts) = 'array'),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  reasoning_tokens integer check (reasoning_tokens >= 0),
  total_tokens integer check (total_tokens >= 0),
  latency_ms integer not null check (latency_ms >= 0),
  created_at timestamptz not null default now()
);
create index modul_ajar_ai_usage_owner_date on public.modul_ajar_ai_usage(user_id, created_at desc);
create index modul_ajar_ai_usage_retention on public.modul_ajar_ai_usage(created_at);
alter table public.modul_ajar_ai_usage enable row level security;
create policy usage_owner_read on public.modul_ajar_ai_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy usage_owner_insert on public.modul_ajar_ai_usage for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.modul_ajar_ai_usage from anon, authenticated;
grant select, insert on public.modul_ajar_ai_usage to authenticated;
grant all on public.modul_ajar_ai_usage to service_role;

create function public.cleanup_modul_ajar_ai_data() returns void language sql security definer set search_path = '' as $$
  delete from public.modul_ajar_ai_cache where expires_at <= now();
  delete from public.modul_ajar_ai_usage where created_at < now() - interval '30 days';
$$;
revoke all on function public.cleanup_modul_ajar_ai_data() from public, anon, authenticated;
grant execute on function public.cleanup_modul_ajar_ai_data() to service_role;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('cleanup-modul-ajar-ai', '0 19 * * *', 'select public.cleanup_modul_ajar_ai_data()');
  end if;
end;
$$;

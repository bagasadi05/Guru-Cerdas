-- Migration: Create push_subscriptions table
-- Stores Web Push API subscriptions per device per user (teachers and parents)
-- Idempotent: safe to re-run

create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint chk_user_or_student check ((user_id is not null) or (student_id is not null))
);

-- Indexes
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_student_id on public.push_subscriptions(student_id);
create index if not exists idx_push_subscriptions_active on public.push_subscriptions(is_active) where is_active = true;
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Drop existing policies to make idempotent
drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;

-- Policies: authenticated users (teachers/admins) can manage only their own rows
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Reuse handle_updated_at function if exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_push_subscriptions_updated_at on public.push_subscriptions;

create trigger handle_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.handle_updated_at();

-- RPC functions for parent portal push subscriptions (security definer)
create or replace function public.subscribe_parent(
  p_student_id uuid,
  p_access_code text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_exists boolean;
  v_sub_id uuid;
begin
  -- Validate access code
  select exists (
    select 1 from public.students
    where id = p_student_id and access_code = p_access_code and deleted_at is null
  ) into v_student_exists;

  if not v_student_exists then
    raise exception 'Kode akses atau ID siswa tidak valid.' using errcode = 'P0001';
  end if;

  -- Upsert subscription
  insert into public.push_subscriptions (
    student_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    is_active,
    last_seen_at
  ) values (
    p_student_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_user_agent,
    true,
    now()
  )
  on conflict (endpoint) do update set
    student_id = p_student_id,
    user_id = null, -- Make sure it's linked to student instead of teacher if endpoint reused
    p256dh = p_p256dh,
    auth = p_auth,
    user_agent = p_user_agent,
    is_active = true,
    last_seen_at = now()
  returning id into v_sub_id;

  return jsonb_build_object('ok', true, 'id', v_sub_id);
end;
$$;

create or replace function public.unsubscribe_parent(
  p_student_id uuid,
  p_access_code text,
  p_endpoint text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_exists boolean;
begin
  -- Validate access code
  select exists (
    select 1 from public.students
    where id = p_student_id and access_code = p_access_code and deleted_at is null
  ) into v_student_exists;

  if not v_student_exists then
    raise exception 'Kode akses atau ID siswa tidak valid.' using errcode = 'P0001';
  end if;

  -- Deactivate subscription
  update public.push_subscriptions
  set is_active = false
  where endpoint = p_endpoint and student_id = p_student_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_parent_subscription_status(
  p_student_id uuid,
  p_access_code text,
  p_endpoint text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_exists boolean;
  v_is_active boolean;
begin
  -- Validate access code
  select exists (
    select 1 from public.students
    where id = p_student_id and access_code = p_access_code and deleted_at is null
  ) into v_student_exists;

  if not v_student_exists then
    raise exception 'Kode akses atau ID siswa tidak valid.' using errcode = 'P0001';
  end if;

  -- Check if active subscription exists
  select is_active into v_is_active
  from public.push_subscriptions
  where endpoint = p_endpoint and student_id = p_student_id
  limit 1;

  return jsonb_build_object(
    'registered', v_is_active is not null,
    'is_active', coalesce(v_is_active, false)
  );
end;
$$;

-- Comments
comment on table public.push_subscriptions is 'Web Push API subscriptions per device for each user or student (parent)';
comment on column public.push_subscriptions.endpoint is 'Push Service endpoint URL (FCM, Mozilla, etc.)';
comment on column public.push_subscriptions.p256dh is 'Elliptic curve Diffie-Hellman public key';
comment on column public.push_subscriptions.auth is 'Authentication secret';
comment on column public.push_subscriptions.is_active is 'False when unsubscribed or expired';
comment on column public.push_subscriptions.student_id is 'Optional association with a student profile for parent push notifications';

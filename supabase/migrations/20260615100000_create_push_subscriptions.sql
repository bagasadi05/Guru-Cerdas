-- Migration: Create push_subscriptions table
-- Stores Web Push API subscriptions per device per user
-- Idempotent: safe to re-run

create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_active on public.push_subscriptions(is_active) where is_active = true;
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Drop existing policies to make idempotent
drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;

-- Policies: user can manage only their own rows
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

-- Comments
comment on table public.push_subscriptions is 'Web Push API subscriptions per device for each user';
comment on column public.push_subscriptions.endpoint is 'Push Service endpoint URL (FCM, Mozilla, etc.)';
comment on column public.push_subscriptions.p256dh is 'Elliptic curve Diffie-Hellman public key';
comment on column public.push_subscriptions.auth is 'Authentication secret';
comment on column public.push_subscriptions.is_active is 'False when unsubscribed or expired';

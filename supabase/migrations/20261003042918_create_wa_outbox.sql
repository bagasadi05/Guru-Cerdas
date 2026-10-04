create table if not exists public.wa_outbox (
  id text primary key,
  phone text not null check (phone ~ '^[0-9+]{9,16}$'),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  claimed_at timestamptz,
  lease_until timestamptz,
  claim_token text,
  attempts int not null default 0 check (attempts >= 0),
  wa_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.wa_outbox
  add column if not exists claimed_at timestamptz,
  add column if not exists lease_until timestamptz,
  add column if not exists claim_token text;

create index if not exists wa_outbox_claim_idx
  on public.wa_outbox (status, lease_until, created_at);

alter table public.wa_outbox enable row level security;
revoke all on table public.wa_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.wa_outbox to service_role;

create or replace function public.worker_claim(
  p_batch int, p_lease_minutes int default 5, p_max_attempts int default 3
)
returns setof public.wa_outbox
language plpgsql security definer set search_path = ''
as $$
begin
  if p_batch is null or p_batch < 1
    or p_lease_minutes is null or p_lease_minutes not between 1 and 30
    or p_max_attempts is null or p_max_attempts <> 3 then
    raise exception 'Invalid worker limits';
  end if;
  return query
  with candidates as (
    select q.id from public.wa_outbox q
    where q.attempts < p_max_attempts
      and (q.status = 'pending'
        or (q.status = 'sending' and q.lease_until < now()))
    order by q.created_at, q.id
    limit least(p_batch, 20)
    for update skip locked
  )
  update public.wa_outbox w
  set status = 'sending', claimed_at = now(),
    lease_until = now() + make_interval(mins => p_lease_minutes),
    claim_token = gen_random_uuid()::text, attempts = w.attempts + 1
  from candidates c where w.id = c.id
  returning w.*;
end;
$$;

create or replace function public.worker_complete(
  p_id text, p_token text, p_status text,
  p_wa_id text default null, p_error text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  if p_status is null or p_status not in ('sent', 'failed') then
    raise exception 'Invalid completion status';
  end if;
  update public.wa_outbox
  set status = p_status, wa_id = coalesce(p_wa_id, wa_id), error = p_error,
    sent_at = case when p_status = 'sent' then coalesce(sent_at, now()) else null end
  where id = p_id and claim_token = p_token
    and (status = 'sending'
      or (status = 'failed' and error = 'delivery_unknown: lease expired at max attempts'
        and p_status = 'sent' and nullif(p_wa_id, '') is not null)
      or (status = 'sent' and p_status = 'sent' and wa_id = p_wa_id));
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.worker_requeue(
  p_id text, p_token text, p_error text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  update public.wa_outbox
  set status = 'pending', error = p_error,
    claimed_at = null, lease_until = null, claim_token = null
  where id = p_id and claim_token = p_token and status = 'sending' and attempts < 3;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.worker_recover(
  p_lease_minutes int default 5, p_max_attempts int default 3
)
returns int
language plpgsql security definer set search_path = ''
as $$
declare n_requeued int; n_failed int;
begin
  if p_max_attempts is null or p_max_attempts <> 3 then
    raise exception 'Invalid attempt limit';
  end if;
  update public.wa_outbox
  set status = 'pending', claimed_at = null, lease_until = null, claim_token = null
  where status = 'sending' and lease_until < now() and attempts < p_max_attempts;
  get diagnostics n_requeued = row_count;
  update public.wa_outbox
  set status = 'failed', sent_at = null,
    error = case when status = 'sending'
      then 'delivery_unknown: lease expired at max attempts'
      else 'max attempts reached' end
  where attempts >= p_max_attempts
    and (status = 'pending' or (status = 'sending' and lease_until < now()));
  get diagnostics n_failed = row_count;
  return n_requeued + n_failed;
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'public.claim_wa_messages(integer)',
    'public.complete_wa_message(text,text,text,text)',
    'public.requeue_wa_message(text,text)',
    'public.requeue_stuck_wa_messages(integer)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', signature);
    end if;
  end loop;
end;
$$;

revoke all on function public.worker_claim(int,int,int) from public, anon, authenticated;
revoke all on function public.worker_complete(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.worker_requeue(text,text,text) from public, anon, authenticated;
revoke all on function public.worker_recover(int,int) from public, anon, authenticated;
grant execute on function public.worker_claim(int,int,int) to service_role;
grant execute on function public.worker_complete(text,text,text,text,text) to service_role;
grant execute on function public.worker_requeue(text,text,text) to service_role;
grant execute on function public.worker_recover(int,int) to service_role;

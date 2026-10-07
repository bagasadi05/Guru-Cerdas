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
      and (q.status = 'pending' or (q.status = 'sending' and q.lease_until < now()))
    order by q.created_at, q.id
    limit 1
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
  if p_status = 'sent' and nullif(btrim(p_wa_id), '') is null then
    raise exception 'A WhatsApp receipt is required';
  end if;
  update public.wa_outbox
  set status = p_status, wa_id = coalesce(p_wa_id, wa_id), error = p_error,
    sent_at = case when p_status = 'sent' then coalesce(sent_at, now()) else null end
  where id = p_id and claim_token = p_token
    and (status = 'sending'
      or (status = 'failed' and starts_with(error, 'delivery_unknown:')
        and p_status = 'sent')
      or (status = 'sent' and p_status = 'sent' and wa_id = p_wa_id)
      or (status = 'failed' and p_status = 'failed' and error is not distinct from p_error
        and wa_id is not distinct from p_wa_id));
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.worker_delivery_health()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with report_day as (
    select (now() at time zone 'Asia/Jakarta')::date as report_date,
      extract(isodow from now() at time zone 'Asia/Jakarta') <= 5
      and (now() at time zone 'Asia/Jakarta')::time >= time '17:10' as due
  ), recipients as (
    select r.class_id from public.wa_report_recipients r
    join public.classes c on c.id = r.class_id
    where r.enabled and c.deleted_at is null and not c.is_archived
  ), counts as (
    select count(*)::int as expected,
      count(*) filter (where w.status = 'sent')::int as sent,
      count(*) filter (where w.status = 'pending')::int as pending,
      count(*) filter (where w.status = 'sending')::int as sending,
      count(*) filter (where w.status = 'failed')::int as failed,
      count(*) filter (where w.id is null)::int as missing
    from recipients r cross join report_day d
    left join public.wa_outbox w on w.id = 'laporan-' || r.class_id || '-' || to_char(d.report_date, 'YYYY-MM-DD')
  )
  select jsonb_build_object('report_date', d.report_date, 'expected', c.expected,
    'sent', c.sent, 'pending', c.pending, 'sending', c.sending, 'failed', c.failed,
    'missing', c.missing, 'needs_attention', d.due and c.sent < c.expected)
  from report_day d cross join counts c;
$$;

create table if not exists public.wa_delivery_reconciliation_audit (
  id bigint generated always as identity primary key,
  delivery_id text not null references public.wa_outbox(id),
  outcome text not null check (outcome in ('sent', 'not_sent')),
  evidence text not null check (char_length(btrim(evidence)) between 1 and 1000),
  before_state jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.wa_delivery_reconciliation_audit enable row level security;
revoke all on public.wa_delivery_reconciliation_audit from public, anon, authenticated;
grant select, insert on public.wa_delivery_reconciliation_audit to service_role;
grant usage, select on sequence public.wa_delivery_reconciliation_audit_id_seq to service_role;

revoke all on function public.worker_claim(int,int,int) from public, anon, authenticated;
revoke all on function public.worker_complete(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.worker_delivery_health() from public, anon, authenticated;
grant execute on function public.worker_claim(int,int,int) to service_role;
grant execute on function public.worker_complete(text,text,text,text,text) to service_role;
grant execute on function public.worker_delivery_health() to service_role;

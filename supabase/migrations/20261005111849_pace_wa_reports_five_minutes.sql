create or replace function public.worker_delivery_health()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with report_day as (
    select (now() at time zone 'Asia/Jakarta')::date as report_date,
      extract(isodow from now() at time zone 'Asia/Jakarta') <= 5 as weekday,
      extract(epoch from ((now() at time zone 'Asia/Jakarta') -
        ((now() at time zone 'Asia/Jakarta')::date + time '17:00'))) as elapsed
  ), recipients as (
    select r.class_id from public.wa_report_recipients r
    join public.classes c on c.id=r.class_id
    where r.enabled and c.deleted_at is null and not c.is_archived
  ), counts as (
    select count(*)::int as expected,
      count(*) filter(where w.status='sent')::int as sent,
      count(*) filter(where w.status='pending')::int as pending,
      count(*) filter(where w.status='sending')::int as sending,
      count(*) filter(where w.status='failed')::int as failed,
      count(*) filter(where w.id is null)::int as missing
    from recipients r cross join report_day d
    left join public.wa_outbox w on w.id='laporan-'||r.class_id||'-'||to_char(d.report_date,'YYYY-MM-DD')
  ), progress as (
    select d.*,c.*,case when d.weekday then greatest(0,least(c.expected,
      floor((d.elapsed-600)/300)::int+1)) else 0 end as expected_sent_by_now
    from report_day d cross join counts c
  )
  select jsonb_build_object('report_date',report_date,'expected',expected,'sent',sent,
    'pending',pending,'sending',sending,'failed',failed,'missing',missing,
    'send_interval_seconds',300,'expected_sent_by_now',expected_sent_by_now,
    'completion_deadline_wib',report_date + time '17:00' + make_interval(secs=>greatest(expected-1,0)*300+600),
    'needs_attention',weekday and elapsed>=600 and
      (failed>0 or missing>0 or sent<expected_sent_by_now))
  from progress;
$$;

revoke all on function public.worker_delivery_health() from public,anon,authenticated;
grant execute on function public.worker_delivery_health() to service_role;

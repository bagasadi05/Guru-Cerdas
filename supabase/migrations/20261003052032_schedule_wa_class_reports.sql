create table public.wa_report_recipients (
  class_id uuid primary key references public.classes(id) on delete cascade,
  phone text not null check (phone ~ '^62[0-9]{8,13}$'),
  enabled boolean not null default true,
  minimum_score numeric not null default 75 check (minimum_score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.wa_report_recipients enable row level security;
revoke all on table public.wa_report_recipients from public, anon, authenticated;
grant select, insert, update, delete on table public.wa_report_recipients to service_role;

create or replace function public.wa_report_text(p_text text, p_limit int default 100)
returns text language sql immutable set search_path = ''
as $$
  select case when char_length(cleaned) > p_limit
    then left(cleaned, greatest(p_limit - 1, 0)) || '…' else cleaned end
  from (select btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]*_~`]+', ' ', 'g')) cleaned) x;
$$;

create or replace function public.build_wa_class_report(p_class_id uuid, p_date date)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  v_name text;
  v_minimum numeric;
  v_start timestamptz := p_date::timestamp at time zone 'Asia/Jakarta';
  v_end timestamptz := (p_date + 1)::timestamp at time zone 'Asia/Jakarta';
  v_message text;
  v_lines text;
  v_count int;
  v_students int;
  v_missing int;
  v_attendance text;
  v_day text;
  v_month text;
begin
  select c.name, r.minimum_score into v_name, v_minimum
  from public.classes c join public.wa_report_recipients r on r.class_id = c.id
  where c.id = p_class_id and c.deleted_at is null and not c.is_archived;
  if v_name is null or p_date is null then return null; end if;

  v_day := (array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'])[extract(isodow from p_date)::int];
  v_month := (array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[extract(month from p_date)::int];
  v_message := '*Laporan Harian — ' || public.wa_report_text(v_name, 60) || '*' || E'\n'
    || v_day || ', ' || extract(day from p_date)::int || ' ' || v_month || ' ' || extract(year from p_date)::int;

  select count(*) into v_count from public.violations v
  join public.students s on s.id = v.student_id
  where s.class_id = p_class_id and s.deleted_at is null
    and v.deleted_at is null and v.date = p_date;
  v_message := v_message || E'\n\n*Pelanggaran:* ' || v_count || ' catatan.';
  if v_count = 0 then
    v_message := v_message || E'\nBelum ada pelanggaran yang tercatat untuk hari ini.';
  else
    select string_agg(x.line, E'\n' order by x.created_at, x.id) into v_lines from (
      select v.id, v.created_at,
        '• ' || public.wa_report_text(s.name, 45) || ': ' || public.wa_report_text(v.description, 90)
        || ' (' || v.points || ' poin).'
        || E'\n  Tindak lanjut: '
        || case v.follow_up_status when 'resolved' then 'selesai' when 'in_progress' then 'dalam proses' else 'belum selesai' end
        || case when nullif(btrim(v.follow_up_notes), '') is not null
          then ' — ' || public.wa_report_text(v.follow_up_notes, 70) else '' end
        || case when nullif(btrim(v.context_notes), '') is not null
          then E'\n  Catatan guru: ' || public.wa_report_text(v.context_notes, 60) else '' end as line
      from public.violations v join public.students s on s.id = v.student_id
      where s.class_id = p_class_id and s.deleted_at is null
        and v.deleted_at is null and v.date = p_date
      order by v.created_at, v.id limit 4
    ) x;
    v_message := v_message || E'\n' || v_lines;
    if v_count > 4 then v_message := v_message || E'\n' || (v_count - 4) || ' catatan lainnya tersedia di aplikasi.'; end if;
  end if;

  select count(*) into v_students from public.students s where s.class_id = p_class_id and s.deleted_at is null;
  with latest as (
    select distinct on (a.student_id) a.student_id,
      coalesce(a.official_status, a.teacher_status, a.status)::text as status
    from public.attendance a join public.students s on s.id = a.student_id
    where s.class_id = p_class_id and s.deleted_at is null and a.deleted_at is null and a.date = p_date
    order by a.student_id, a.official_at desc nulls last, a.created_at desc, a.id
  ), counts as (
    select status, count(*) as n from latest group by status
  )
  select coalesce(sum(n), 0)::int, string_agg(n || ' ' || case status when 'Alpha' then 'alpa' else lower(status) end, ', ' order by status)
  into v_count, v_attendance from counts;
  v_missing := greatest(v_students - v_count, 0);
  v_message := v_message || E'\n\n*Kehadiran tercatat:* ' || coalesce(v_attendance, 'belum ada catatan') || '.';
  if v_missing > 0 then v_message := v_message || E'\n' || v_missing || ' dari ' || v_students || ' siswa belum memiliki catatan kehadiran.'; end if;
  select string_agg(x.line, E'\n' order by x.name) into v_lines from (
    select s.name, '• ' || public.wa_report_text(s.name, 45) || ': ' || case a.status when 'Alpha' then 'alpa' else lower(a.status) end as line
    from public.students s join (
      select distinct on (a.student_id) a.student_id,
        coalesce(a.official_status, a.teacher_status, a.status)::text as status
      from public.attendance a where a.date = p_date and a.deleted_at is null
      order by a.student_id, a.official_at desc nulls last, a.created_at desc, a.id
    ) a on a.student_id = s.id
    where s.class_id = p_class_id and s.deleted_at is null and a.status in ('Alpha', 'Sakit', 'Izin')
    order by s.name, s.id limit 4
  ) x;
  if v_lines is not null then v_message := v_message || E'\n' || v_lines; end if;

  select count(*) into v_count from public.academic_records a
  join public.students s on s.id = a.student_id
  where s.class_id = p_class_id and s.deleted_at is null and a.deleted_at is null
    and a.created_at >= v_start and a.created_at < v_end;
  v_message := v_message || E'\n\n*Nilai baru dicatat:* ' || v_count || ' catatan.';
  if v_count = 0 then
    v_message := v_message || E'\nBelum ada nilai baru yang tercatat hari ini.';
  else
    select count(*) into v_count from public.academic_records a
    join public.students s on s.id = a.student_id
    where s.class_id = p_class_id and s.deleted_at is null and a.deleted_at is null
      and a.created_at >= v_start and a.created_at < v_end and a.score < v_minimum;
    v_message := v_message || E'\n' || v_count || ' nilai di bawah batas laporan ' || v_minimum || '.';
    select string_agg(x.line, E'\n' order by x.score, x.id) into v_lines from (
      select a.id, a.score,
        '• ' || public.wa_report_text(s.name, 45) || ': ' || public.wa_report_text(a.subject, 35)
        || ' ' || a.score || case when nullif(btrim(a.assessment_name), '') is not null
          then ' (' || public.wa_report_text(a.assessment_name, 35) || ')' else '' end
        || case when nullif(btrim(a.notes), '') is not null then ' — ' || public.wa_report_text(a.notes, 70) else '' end as line
      from public.academic_records a join public.students s on s.id = a.student_id
      where s.class_id = p_class_id and s.deleted_at is null and a.deleted_at is null
        and a.created_at >= v_start and a.created_at < v_end and a.score < v_minimum
      order by a.score, a.id limit 4
    ) x;
    if v_lines is not null then v_message := v_message || E'\n' || v_lines; end if;
    if v_count > 4 then v_message := v_message || E'\n' || (v_count - 4) || ' nilai lainnya tersedia di aplikasi.'; end if;
  end if;

  select count(*), count(distinct q.student_id) into v_count, v_students
  from public.quiz_points q join public.students s on s.id = q.student_id
  where s.class_id = p_class_id and s.deleted_at is null and q.deleted_at is null and q.quiz_date = p_date;
  v_message := v_message || E'\n\n*Kuis/keaktifan:* ' || v_count || ' catatan untuk ' || v_students || ' siswa.';
  if v_count = 0 then
    v_message := v_message || E'\nBelum ada kuis atau keaktifan yang tercatat hari ini.';
  else
    select string_agg(x.line, E'\n' order by x.quiz_name, x.subject) into v_lines from (
      select q.quiz_name, q.subject,
        '• ' || public.wa_report_text(q.quiz_name, 60)
        || case when nullif(btrim(q.subject), '') is not null then ' (' || public.wa_report_text(q.subject, 35) || ')' else '' end
        || ': ' || count(distinct q.student_id) || ' siswa.' as line
      from public.quiz_points q join public.students s on s.id = q.student_id
      where s.class_id = p_class_id and s.deleted_at is null and q.deleted_at is null and q.quiz_date = p_date
      group by q.quiz_name, q.subject order by q.quiz_name, q.subject limit 3
    ) x;
    v_message := v_message || E'\n' || v_lines;
  end if;

  if char_length(v_message) > 3800 then v_message := left(v_message, 3770) || E'\n… Rincian lainnya tersedia di aplikasi.'; end if;
  return v_message || E'\n\nData sesuai catatan yang tersimpan saat laporan dibuat.\nDetail: https://www.guru-cerdas.my.id/';
end;
$$;

create or replace function public.enqueue_wa_daily_reports(
  p_report_date date default (now() at time zone 'Asia/Jakarta')::date,
  p_dry_run boolean default false
)
returns table(delivery_id text, recipient_class_id uuid, queued boolean, report_message text)
language plpgsql security definer set search_path = ''
as $$
declare v_recipient record; v_id text; v_message text; v_inserted int;
begin
  if p_report_date is null or p_dry_run is null then raise exception 'Report date and dry_run are required'; end if;
  if not p_dry_run and extract(isodow from p_report_date) > 5 then return; end if;
  for v_recipient in
    select r.class_id, r.phone from public.wa_report_recipients r
    join public.classes c on c.id = r.class_id
    where r.enabled and c.deleted_at is null and not c.is_archived
    order by r.class_id
  loop
    v_id := 'laporan-' || v_recipient.class_id || '-' || to_char(p_report_date, 'YYYY-MM-DD');
    v_message := public.build_wa_class_report(v_recipient.class_id, p_report_date);
    if v_message is null then continue; end if;
    v_inserted := 0;
    if not p_dry_run then
      insert into public.wa_outbox(id, phone, message)
      values (v_id, v_recipient.phone, v_message)
      on conflict (id) do nothing;
      get diagnostics v_inserted = row_count;
    end if;
    return query select v_id, v_recipient.class_id, v_inserted = 1, v_message;
  end loop;
end;
$$;

revoke all on function public.wa_report_text(text,int) from public, anon, authenticated;
revoke all on function public.build_wa_class_report(uuid,date) from public, anon, authenticated;
revoke all on function public.enqueue_wa_daily_reports(date,boolean) from public, anon, authenticated;
grant execute on function public.wa_report_text(text,int) to service_role;
grant execute on function public.build_wa_class_report(uuid,date) to service_role;
grant execute on function public.enqueue_wa_daily_reports(date,boolean) to service_role;

select cron.unschedule('wa-daily-class-report')
where exists (select 1 from cron.job where jobname = 'wa-daily-class-report');
select cron.schedule('wa-daily-class-report', '0 10 * * 1-5', 'select public.enqueue_wa_daily_reports();');

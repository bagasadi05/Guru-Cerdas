alter table public.wa_report_recipients
  add column salutation text not null default 'Ustadz/Ustadzah'
    check (salutation in ('Ustadz', 'Ustadzah', 'Ustadz/Ustadzah'));

update public.wa_report_recipients r
set salutation = 'Ustadz'
from public.classes c
where c.id = r.class_id and c.name = 'Kelas 3A'
  and c.deleted_at is null and not c.is_archived;

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
  v_teacher text;
  v_salutation text;
  v_prefix text;
  v_footer text;
  v_limit int;
  v_first_report boolean;
begin
  select c.name, r.minimum_score, r.salutation,
    (select nullif(btrim(split_part(u.full_name, ',', 1)), '')
     from public.user_roles u
     where u.user_id = c.wali_kelas_id and u.deleted_at is null
       and nullif(btrim(u.full_name), '') is not null
     order by u.updated_at desc nulls last, u.id limit 1)
  into v_name, v_minimum, v_salutation, v_teacher
  from public.classes c join public.wa_report_recipients r on r.class_id = c.id
  where c.id = p_class_id and c.deleted_at is null and not c.is_archived;
  if v_name is null or p_date is null then return null; end if;

  select not exists (
    select 1 from public.wa_outbox o
    where o.id like 'laporan-' || p_class_id::text || '-%'
      and o.status = 'sent'
  ) into v_first_report;
  v_prefix := 'Selamat sore, ' || v_salutation
    || case when v_teacher is not null then ' ' || public.wa_report_text(v_teacher, 70) else '' end
    || E' 👋\n\nSaya *Robot Guru Cerdas*'
    || case when v_first_report
      then ', asisten yang membantu merangkum kegiatan kelas.'
      else '.' end
    || E' Berikut laporan ' || public.wa_report_text(v_name, 60) || E' hari ini.\n\n';
  v_footer := E'\n\nData sesuai catatan yang tersimpan saat laporan dibuat.'
    || E'\nLihat catatan lengkap di https://www.guru-cerdas.my.id/'
    || E'\n\nTerima kasih sudah mendampingi anak-anak hari ini, ' || v_salutation || '.'
    || ' Semoga setiap ilmu dan kesabaran yang diberikan menjadi amal kebaikan.'
    || ' Selamat beristirahat dan tetap semangat 🌱';

  v_day := (array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'])[extract(isodow from p_date)::int];
  v_month := (array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[extract(month from p_date)::int];
  v_message := '*Laporan Harian — ' || public.wa_report_text(v_name, 60) || '*' || E'\n'
    || v_day || ', ' || extract(day from p_date)::int || ' ' || v_month || ' ' || extract(year from p_date)::int;

  select count(*) into v_count from public.violations v
  join public.students s on s.id = v.student_id
  where s.class_id = p_class_id and s.deleted_at is null
    and v.deleted_at is null and v.date = p_date;
  v_message := v_message || E'\n\n🤝 *Catatan pelanggaran dan tindak lanjut:* ' || v_count || ' catatan.';
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
  v_message := v_message || E'\n\n📋 *Kehadiran tercatat:* ' || coalesce(v_attendance, 'belum ada catatan') || '.';
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
  v_message := v_message || E'\n\n📝 *Nilai baru dicatat:* ' || v_count || ' catatan.';
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
  v_message := v_message || E'\n\n📚 *Kuis/keaktifan:* ' || v_count || ' catatan untuk ' || v_students || ' siswa.';
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

  v_limit := 4000 - char_length(v_prefix) - char_length(v_footer);
  if char_length(v_message) > v_limit then
    v_message := left(v_message, v_limit - char_length(E'\n… Rincian lainnya tersedia di aplikasi.'))
      || E'\n… Rincian lainnya tersedia di aplikasi.';
  end if;
  return v_prefix || v_message || v_footer;
end;
$$;

revoke all on function public.build_wa_class_report(uuid,date) from public, anon, authenticated;
grant execute on function public.build_wa_class_report(uuid,date) to service_role;


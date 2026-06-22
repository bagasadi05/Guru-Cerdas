-- Migration: Create Web Push triggers for academic_records, attendance, and announcements
-- Safe to run multiple times (idempotent)

-- Helper function to call dispatch-push Edge Function via pg_net
create or replace function public.invoke_dispatch_push_instant(
  p_student_id uuid,
  p_event_type text,
  p_payload jsonb
) returns void as $$
declare
  supabase_url text;
  response_id bigint;
  request_body jsonb;
begin
  -- Get Supabase URL from current settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Fallback to default production/staging URL
  if supabase_url is null or supabase_url = '' then
    supabase_url := 'https://fddvcyqbfqydvsfujcxd.supabase.co';
  end if;

  request_body := jsonb_build_object(
    'mode', 'instant',
    'event', p_event_type,
    'student_id', p_student_id,
    'payload', p_payload
  );

  -- Perform asynchronous HTTP POST via pg_net (no wait)
  response_id := net.http_post(
    url := supabase_url || '/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := request_body
  );
end;
$$ language plpgsql security definer;

-- Trigger function for new academic record (grade input)
create or replace function public.on_academic_record_inserted()
returns trigger as $$
declare
  v_student_name text;
  v_payload jsonb;
begin
  select name into v_student_name from public.students where id = NEW.student_id;
  
  v_payload := jsonb_build_object(
    'title', '📝 Nilai Baru Terinput',
    'body', format('Nilai baru untuk %s: %s (%s) pada mapel %s.', 
              v_student_name, 
              NEW.score::text, 
              coalesce(NEW.assessment_name, 'Penilaian'), 
              NEW.subject
            )
  );

  perform public.invoke_dispatch_push_instant(NEW.student_id, 'grade_input', v_payload);
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger function for attendance input or updates
create or replace function public.on_attendance_inserted_or_updated()
returns trigger as $$
declare
  v_student_name text;
  v_status_label text;
  v_payload jsonb;
begin
  -- Trigger only on insert, or if status or date changes on update
  if (TG_OP = 'UPDATE' and OLD.status = NEW.status and OLD.date = NEW.date) then
    return NEW;
  end if;

  select name into v_student_name from public.students where id = NEW.student_id;
  
  v_status_label := case NEW.status::text
    when 'present' then 'Hadir'
    when 'sick' then 'Sakit'
    when 'permission' then 'Izin'
    when 'absent' then 'Alpha'
    else NEW.status::text
  end;

  v_payload := jsonb_build_object(
    'title', '🕒 Absensi Siswa',
    'body', format('%s tercatat %s pada tanggal %s.', 
              v_student_name, 
              v_status_label, 
              to_char(NEW.date, 'DD-MM-YYYY')
            )
  );

  perform public.invoke_dispatch_push_instant(NEW.student_id, 'attendance_input', v_payload);
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger function for new announcements
create or replace function public.on_announcement_inserted()
returns trigger as $$
declare
  v_payload jsonb;
  v_excerpt text;
begin
  -- Only notify for all or parents audience
  if NEW.audience_type not in ('all', 'parents') then
    return NEW;
  end if;

  v_excerpt := NEW.content;
  if length(v_excerpt) > 100 then
    v_excerpt := substring(v_excerpt from 1 for 97) || '...';
  end if;

  v_payload := jsonb_build_object(
    'title', format('📢 %s', NEW.title),
    'body', v_excerpt
  );

  -- Since announcements are class/school-wide, student_id is set to null
  perform public.invoke_dispatch_push_instant(null, 'announcement_input', v_payload);
  return NEW;
end;
$$ language plpgsql security definer;

-- Bind triggers to tables
drop trigger if exists tr_academic_record_push on public.academic_records;
create trigger tr_academic_record_push
  after insert on public.academic_records
  for each row
  execute function public.on_academic_record_inserted();

drop trigger if exists tr_attendance_push on public.attendance;
create trigger tr_attendance_push
  after insert or update on public.attendance
  for each row
  execute function public.on_attendance_inserted_or_updated();

drop trigger if exists tr_announcement_push on public.announcements;
create trigger tr_announcement_push
  after insert on public.announcements
  for each row
  execute function public.on_announcement_inserted();

-- Permissions
grant execute on function public.invoke_dispatch_push_instant(uuid, text, jsonb) to service_role;
grant execute on function public.on_academic_record_inserted() to service_role;
grant execute on function public.on_attendance_inserted_or_updated() to service_role;
grant execute on function public.on_announcement_inserted() to service_role;

create or replace function public.can_manage_ph_schedule(p_class_id uuid, p_semester_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.classes c join public.semesters s on s.id = p_semester_id
    where c.id = p_class_id and c.deleted_at is null and not c.is_archived
      and s.deleted_at is null and not coalesce(s.is_locked, false)
      and (public.is_admin_user(auth.uid()) or public.has_teacher_class_assignment(
        auth.uid(), p_class_id, p_semester_id, array['homeroom'], null))
  );
$$;
revoke all on function public.can_manage_ph_schedule(uuid,uuid) from public, anon;
grant execute on function public.can_manage_ph_schedule(uuid,uuid) to authenticated, service_role;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ph_schedules' and cmd in ('INSERT','UPDATE','DELETE','ALL') loop
    execute format('drop policy %I on public.ph_schedules', p.policyname);
  end loop;
end $$;
create policy "PH managers can insert" on public.ph_schedules for insert to authenticated
  with check (public.can_manage_ph_schedule(class_id,semester_id) and created_by = auth.uid());
create policy "PH managers can update" on public.ph_schedules for update to authenticated
  using (public.can_manage_ph_schedule(class_id,semester_id))
  with check (public.can_manage_ph_schedule(class_id,semester_id));
create policy "PH managers can delete" on public.ph_schedules for delete to authenticated
  using (public.can_manage_ph_schedule(class_id,semester_id));

create or replace function public.ph_period_range(p_label text)
returns int4range language plpgsql immutable set search_path = '' as $$
declare v_label text; v_first int; v_last int;
begin
  v_label := replace(replace(btrim(p_label), '–', '-'), '—', '-');
  v_label := regexp_replace(v_label, '[[:space:]]', '', 'g');
  if v_label !~ '^[0-9]{1,2}(-[0-9]{1,2})?$' then return null; end if;
  v_first := split_part(v_label, '-', 1)::int;
  v_last := coalesce(nullif(split_part(v_label, '-', 2), '')::int, v_first);
  if v_first < 1 or v_last < v_first or v_last > 20 then return null; end if;
  return int4range(v_first, v_last + 1, '[)');
end;
$$;
revoke all on function public.ph_period_range(text) from public, anon, authenticated;
grant execute on function public.ph_period_range(text) to service_role;

create or replace function public.validate_ph_schedule_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_range int4range; v_start date; v_end date;
begin
  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by then raise exception 'Pembuat jadwal tidak boleh diubah.'; end if;
    if new.deleted_at is not null then return new; end if;
  end if;
  if btrim(new.subject) = '' or btrim(new.subject) like '(%' then
    raise exception 'Mata pelajaran wajib diisi sebelum materi.';
  end if;
  select start_date,end_date into v_start,v_end from public.semesters where id = new.semester_id and deleted_at is null;
  if v_start is null or new.date not between v_start and v_end then
    raise exception 'Tanggal PH harus berada dalam periode semester yang dipilih.';
  end if;
  v_range := public.ph_period_range(new.period_label);
  if v_range is null then raise exception 'Isi jam pelajaran 1–20, misalnya 1 atau 1-2.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.class_id::text || ':' || new.semester_id::text, 0));
  if exists (select 1 from public.ph_schedules p where p.id <> new.id
    and p.class_id = new.class_id and p.semester_id = new.semester_id
    and p.date = new.date and p.deleted_at is null
    and public.ph_period_range(p.period_label) && v_range) then
    raise exception 'Jam pelajaran bertumpang tindih dengan jadwal PH lain pada tanggal tersebut.';
  end if;
  new.subject := btrim(new.subject);
  new.period_label := lower(v_range)::text || case when upper(v_range) - 1 <> lower(v_range) then '-' || (upper(v_range) - 1)::text else '' end;
  return new;
end;
$$;
revoke all on function public.validate_ph_schedule_write() from public, anon, authenticated;
drop trigger if exists validate_ph_schedule_write on public.ph_schedules;
create trigger validate_ph_schedule_write before insert or update on public.ph_schedules
  for each row execute function public.validate_ph_schedule_write();

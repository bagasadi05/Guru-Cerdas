begin;

-- Exercise real RLS as a teacher; all fixture schedules and notifications roll back.
do $$
declare
  v_teacher uuid;
  v_other_teacher uuid;
  v_class uuid;
  v_semester uuid;
  v_date date;
  v_own_schedule uuid := gen_random_uuid();
  v_other_schedule uuid := gen_random_uuid();
  v_rows integer;
  v_checked integer := 0;
  v_expected_classes integer;
  v_role record;
begin
  select count(*) into v_expected_classes from public.classes
  where deleted_at is null and not is_archived;
  for v_role in
    select user_id from public.user_roles
    where role = 'teacher' and is_approved and deleted_at is null
  loop
    perform set_config('request.jwt.claim.sub', v_role.user_id::text, true);
    if exists (
      select 1 from public.classes c cross join public.semesters s
      where c.deleted_at is null and not c.is_archived
        and s.deleted_at is null and not coalesce(s.is_locked, false)
        and not public.can_add_ph_schedule(c.id, s.id)) then
      raise exception 'An approved teacher must be allowed to add PH to every active class';
    end if;
    v_checked := v_checked + 1;
  end loop;
  if v_checked = 0 then raise exception 'No approved teachers verified'; end if;
  perform set_config('request.jwt.claim.sub', '', true);

  select ur.user_id, c.id, s.id, day::date
    into v_teacher, v_class, v_semester, v_date
  from public.user_roles ur
  cross join public.classes c
  cross join public.semesters s
  cross join lateral generate_series(s.start_date::timestamp, s.end_date::timestamp, interval '1 day') day
  where ur.role = 'teacher' and ur.is_approved and ur.deleted_at is null
    and c.deleted_at is null and not c.is_archived
    and s.deleted_at is null and not coalesce(s.is_locked, false)
    and c.wali_kelas_id is distinct from ur.user_id
    and not public.has_teacher_class_assignment(ur.user_id, c.id, s.id, array['homeroom'], null)
    and not exists (
      select 1 from public.ph_schedules p
      where p.class_id = c.id and p.semester_id = s.id and p.date = day::date
        and p.deleted_at is null)
  order by s.is_active desc, day
  limit 1;
  if v_teacher is null then raise exception 'No non-homeroom teacher fixture is available'; end if;

  select user_id into v_other_teacher from public.user_roles
  where role = 'teacher' and is_approved and deleted_at is null and user_id <> v_teacher
  limit 1;
  if v_other_teacher is null then raise exception 'A second teacher is required'; end if;

  insert into public.ph_schedules (id, class_id, semester_id, subject, date, period_label, created_by)
  values (v_other_schedule, v_class, v_semester, 'Uji izin PH', v_date, '19', v_other_teacher);

  perform set_config('request.jwt.claim.sub', v_teacher::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  if public.can_manage_ph_schedule(v_class, v_semester) then
    raise exception 'Fixture teacher must not manage all PH';
  end if;
  if not public.can_add_ph_schedule(v_class, v_semester) then
    raise exception 'An approved non-homeroom teacher must be allowed to add PH';
  end if;
  if not exists (select 1 from public.list_ph_schedule_classes() c where c.id = v_class) then
    raise exception 'An approved teacher must be able to select an unassigned PH class';
  end if;
  if (select count(*) from public.list_ph_schedule_classes()) <> v_expected_classes then
    raise exception 'The PH class picker must include every active class';
  end if;
  if public.can_add_ph_schedule(gen_random_uuid(), v_semester)
    or public.can_add_ph_schedule(v_class, gen_random_uuid()) then
    raise exception 'Invalid class or semester must be denied';
  end if;

  insert into public.ph_schedules (id, class_id, semester_id, subject, date, period_label, created_by)
  values (v_own_schedule, v_class, v_semester, 'Uji izin PH', v_date, '20', v_teacher);

  update public.ph_schedules set subject = 'Uji perubahan PH' where id = v_own_schedule;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'A teacher must be allowed to edit their own PH'; end if;

  update public.ph_schedules set subject = 'Tidak boleh berubah' where id = v_other_schedule;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'A teacher must not edit another teacher''s PH'; end if;
  update public.ph_schedules set deleted_at = now() where id = v_other_schedule;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'A teacher must not soft-delete another teacher''s PH'; end if;
  delete from public.ph_schedules where id = v_other_schedule;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'A teacher must not delete another teacher''s PH'; end if;

  begin
    insert into public.ph_schedules (class_id, semester_id, subject, date, period_label, created_by)
    values (v_class, v_semester, 'Uji pemalsuan pembuat', v_date, '18', v_other_teacher);
    raise exception 'A teacher must not insert PH on behalf of another teacher';
  exception when insufficient_privilege then null;
  end;

  update public.ph_schedules set deleted_at = now() where id = v_own_schedule;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'A teacher must be allowed to soft-delete their own PH'; end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if public.can_add_ph_schedule(v_class, v_semester) then
    raise exception 'An account without an approved teacher role must be denied';
  end if;
  if exists (select 1 from public.list_ph_schedule_classes()) then
    raise exception 'An account without an approved teacher role must not list PH classes';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  if public.can_add_ph_schedule(v_class, v_semester) then
    raise exception 'An anonymous caller must be denied';
  end if;

  execute 'reset role';
  raise notice 'PASS: % teachers can add PH; own edit/delete, foreign ownership denial, spoofing denial, invalid targets and unauthenticated denial', v_checked;
end;
$$;

rollback;

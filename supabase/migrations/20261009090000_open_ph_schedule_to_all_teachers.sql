-- Jadwal PH terbuka untuk semua guru.
--
-- Setiap akun guru yang sudah disetujui boleh menambah PH di kelas aktif mana pun.
-- Pembuat mengelola PH miliknya; wali kelas dan admin tetap mengelola semua PH
-- di kelasnya (can_manage_ph_schedule tidak berubah). Wali kelas mendapat
-- notifikasi saat guru lain menambah, mengubah, atau membatalkan PH di kelasnya.

create or replace function public.can_add_ph_schedule(p_class_id uuid, p_semester_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.deleted_at is null
        and ur.is_approved and ur.role not in ('student', 'parent'))
    and exists (
      select 1 from public.classes c join public.semesters s on s.id = p_semester_id
      where c.id = p_class_id and c.deleted_at is null and not c.is_archived
        and s.deleted_at is null and not coalesce(s.is_locked, false));
$$;
revoke all on function public.can_add_ph_schedule(uuid, uuid) from public, anon;
grant execute on function public.can_add_ph_schedule(uuid, uuid) to authenticated, service_role;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ph_schedules' and cmd in ('INSERT','UPDATE','DELETE','ALL') loop
    execute format('drop policy %I on public.ph_schedules', p.policyname);
  end loop;
end $$;

create policy "Teachers can add PH" on public.ph_schedules for insert to authenticated
  with check (created_by = auth.uid() and public.can_add_ph_schedule(class_id, semester_id));
create policy "PH creator or homeroom can update" on public.ph_schedules for update to authenticated
  using (public.can_manage_ph_schedule(class_id, semester_id)
    or (created_by = auth.uid() and public.can_add_ph_schedule(class_id, semester_id)))
  with check (public.can_manage_ph_schedule(class_id, semester_id)
    or (created_by = auth.uid() and public.can_add_ph_schedule(class_id, semester_id)));
create policy "PH creator or homeroom can delete" on public.ph_schedules for delete to authenticated
  using (public.can_manage_ph_schedule(class_id, semester_id)
    or (created_by = auth.uid() and public.can_add_ph_schedule(class_id, semester_id)));

-- "Senin, 12 Okt 2026, jam ke-1-2"
create or replace function public.format_ph_slot(p_date date, p_period text)
returns text language sql immutable set search_path = '' as $$
  select (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from p_date)::int + 1]
    || ', ' || extract(day from p_date)::int
    || ' ' || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from p_date)::int]
    || ' ' || extract(year from p_date)::int
    || ', jam ke-' || p_period;
$$;
revoke all on function public.format_ph_slot(date, text) from public, anon, authenticated;

-- Homeroom teachers of a class for a semester, minus whoever made the change.
create or replace function public.ph_homeroom_recipients(p_class_id uuid, p_semester_id uuid, p_actor uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.user_id from (
    select tca.teacher_user_id as user_id from public.teacher_class_assignments tca
    where tca.class_id = p_class_id and tca.semester_id = p_semester_id
      and tca.assignment_role = 'homeroom' and tca.deleted_at is null
    union
    select c.wali_kelas_id from public.classes c
    where c.id = p_class_id and c.wali_kelas_id is not null
  ) r
  where r.user_id is distinct from p_actor;
$$;
revoke all on function public.ph_homeroom_recipients(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.ph_actor_name(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select coalesce(nullif(btrim(ur.full_name), ''), ur.email) from public.user_roles ur
     where ur.user_id = p_user_id and ur.deleted_at is null limit 1),
    'Guru lain');
$$;
revoke all on function public.ph_actor_name(uuid) from public, anon, authenticated;

-- A batch save inserts many rows in one statement; each class gets one summary notification.
create or replace function public.notify_homeroom_on_ph_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  g record;
  v_list text;
begin
  for g in
    select i.class_id, i.semester_id, i.created_by, count(*) as total,
      array_agg(i.subject || ' (' || public.format_ph_slot(i.date, i.period_label) || ')' order by i.date, i.period_label) as items
    from inserted i
    where i.deleted_at is null
    group by i.class_id, i.semester_id, i.created_by
  loop
    v_list := array_to_string(g.items[1:3], '; ')
      || case when g.total > 3 then '; dan ' || (g.total - 3) || ' PH lainnya' else '' end;
    insert into public.internal_notifications (user_id, title, message, type, action_url)
    select r, 'Jadwal PH baru',
      public.ph_actor_name(g.created_by) || ' menjadwalkan PH di '
        || (select c.name from public.classes c where c.id = g.class_id) || ': ' || v_list || '.',
      'info', '/jadwal?tab=ph&kelas=' || g.class_id
    from public.ph_homeroom_recipients(g.class_id, g.semester_id, coalesce(auth.uid(), g.created_by)) r;
  end loop;
  return null;
end;
$$;
revoke all on function public.notify_homeroom_on_ph_insert() from public, anon, authenticated;

create or replace function public.notify_homeroom_on_ph_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
  v_title text;
  v_message text;
  v_class text;
begin
  select c.name into v_class from public.classes c where c.id = new.class_id;
  if old.deleted_at is null and new.deleted_at is not null then
    v_title := 'Jadwal PH dibatalkan';
    v_message := public.ph_actor_name(v_actor) || ' membatalkan PH ' || new.subject || ' di ' || v_class
      || ' (' || public.format_ph_slot(new.date, new.period_label) || ').';
  elsif new.deleted_at is null
    and (new.subject, new.date, new.period_label) is distinct from (old.subject, old.date, old.period_label) then
    v_title := 'Jadwal PH diubah';
    v_message := public.ph_actor_name(v_actor) || ' mengubah PH ' || old.subject || ' di ' || v_class
      || ' menjadi ' || new.subject || ' (' || public.format_ph_slot(new.date, new.period_label) || ')'
      || case when (new.date, new.period_label) is distinct from (old.date, old.period_label)
           then ', sebelumnya ' || public.format_ph_slot(old.date, old.period_label) else '' end || '.';
  else
    return new;
  end if;

  insert into public.internal_notifications (user_id, title, message, type, action_url)
  select r, v_title, v_message, 'warning', '/jadwal?tab=ph&kelas=' || new.class_id
  from public.ph_homeroom_recipients(new.class_id, new.semester_id, v_actor) r;
  return new;
end;
$$;
revoke all on function public.notify_homeroom_on_ph_update() from public, anon, authenticated;

drop trigger if exists notify_homeroom_on_ph_insert on public.ph_schedules;
create trigger notify_homeroom_on_ph_insert after insert on public.ph_schedules
  referencing new table as inserted
  for each statement execute function public.notify_homeroom_on_ph_insert();

drop trigger if exists notify_homeroom_on_ph_update on public.ph_schedules;
create trigger notify_homeroom_on_ph_update after update on public.ph_schedules
  for each row execute function public.notify_homeroom_on_ph_update();

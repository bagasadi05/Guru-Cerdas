create or replace function public.can_manage_ph_schedule(p_class_id uuid, p_semester_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.classes c join public.semesters s on s.id = p_semester_id
    where c.id = p_class_id and c.deleted_at is null and not c.is_archived
      and s.deleted_at is null and not coalesce(s.is_locked, false)
      and (public.is_admin_user(auth.uid())
        or (c.wali_kelas_id = auth.uid() and s.is_active = true)
        or public.has_teacher_class_assignment(
          auth.uid(), p_class_id, p_semester_id, array['homeroom'], null))
  );
$$;
revoke all on function public.can_manage_ph_schedule(uuid,uuid) from public, anon;
grant execute on function public.can_manage_ph_schedule(uuid,uuid) to authenticated, service_role;

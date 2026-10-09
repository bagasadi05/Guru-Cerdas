-- PH class selection must not widen access to student rosters or class management.
create or replace function public.list_ph_schedule_classes()
returns table (id uuid, name text, wali_kelas_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name::text, c.wali_kelas_id
  from public.classes c
  where c.deleted_at is null and not c.is_archived
    and auth.uid() is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.deleted_at is null
        and ur.is_approved and ur.role not in ('student', 'parent'))
  order by c.name;
$$;

revoke all on function public.list_ph_schedule_classes() from public, anon;
grant execute on function public.list_ph_schedule_classes() to authenticated, service_role;

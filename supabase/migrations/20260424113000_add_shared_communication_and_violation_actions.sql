alter table if exists public.communications
    add column if not exists teacher_id uuid,
    add column if not exists parent_id uuid;

update public.communications
set teacher_id = user_id
where sender = 'teacher'
  and teacher_id is null;

create or replace function public.mark_accessible_communications_read(p_message_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_count integer := 0;
begin
    update public.communications as communication
    set is_read = true
    where communication.id = any(coalesce(p_message_ids, array[]::uuid[]))
      and communication.sender = 'parent'
      and exists (
          select 1
          from public.students student
          where student.id = communication.student_id
            and student.deleted_at is null
            and public.can_access_student_roster(auth.uid(), student.class_id)
      );

    get diagnostics updated_count = row_count;
    return updated_count;
end;
$$;

grant execute on function public.mark_accessible_communications_read(uuid[]) to authenticated;

create or replace function public.update_accessible_violation_follow_up(
    p_violation_id uuid,
    p_status text default null,
    p_notes text default null,
    p_parent_notified boolean default null,
    p_parent_notified_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.violations as violation
    set
        follow_up_status = coalesce(p_status, violation.follow_up_status),
        follow_up_notes = case
            when p_notes is null then violation.follow_up_notes
            else p_notes
        end,
        parent_notified = coalesce(p_parent_notified, violation.parent_notified),
        parent_notified_at = case
            when p_parent_notified_at is null then violation.parent_notified_at
            else p_parent_notified_at
        end
    where violation.id = p_violation_id
      and violation.deleted_at is null
      and public.can_access_student_behavior_record(auth.uid(), violation.student_id, violation.semester_id);

    return found;
end;
$$;

grant execute on function public.update_accessible_violation_follow_up(uuid, text, text, boolean, timestamptz) to authenticated;

drop policy if exists "Authenticated users can view own rows" on public.communications;
drop policy if exists "Authenticated users can insert own rows" on public.communications;
drop policy if exists "Authenticated users can update own rows" on public.communications;
drop policy if exists "Authenticated users can delete own rows" on public.communications;

drop policy if exists "Teachers can view accessible communications" on public.communications;
create policy "Teachers can view accessible communications"
on public.communications
for select
using (
    exists (
        select 1
        from public.students student
        where student.id = student_id
          and student.deleted_at is null
          and public.can_access_student_roster(auth.uid(), student.class_id)
    )
);

drop policy if exists "Teachers can insert own accessible communications" on public.communications;
create policy "Teachers can insert own accessible communications"
on public.communications
for insert
with check (
    auth.uid() = user_id
    and auth.uid() = teacher_id
    and exists (
        select 1
        from public.students student
        where student.id = student_id
          and student.deleted_at is null
          and public.can_access_student_roster(auth.uid(), student.class_id)
    )
);

drop policy if exists "Teachers can update own communications" on public.communications;
create policy "Teachers can update own communications"
on public.communications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Teachers can delete own communications" on public.communications;
create policy "Teachers can delete own communications"
on public.communications
for delete
using (auth.uid() = user_id);

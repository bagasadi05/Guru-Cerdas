create table if not exists public.teacher_class_assignments (
    id uuid primary key default gen_random_uuid(),
    teacher_user_id uuid not null,
    class_id uuid not null references public.classes(id) on delete cascade,
    semester_id uuid not null references public.semesters(id) on delete cascade,
    assignment_role text not null check (assignment_role in ('homeroom', 'subject_teacher')),
    subject_name text,
    notes text,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint teacher_class_assignments_subject_name_check
        check (
            (assignment_role = 'homeroom' and subject_name is null)
            or
            (assignment_role = 'subject_teacher' and nullif(btrim(subject_name), '') is not null)
        )
);

create unique index if not exists teacher_class_assignments_unique_active_idx
    on public.teacher_class_assignments (
        teacher_user_id,
        class_id,
        semester_id,
        assignment_role,
        coalesce(lower(subject_name), '')
    )
    where deleted_at is null;

create index if not exists teacher_class_assignments_teacher_idx
    on public.teacher_class_assignments (teacher_user_id)
    where deleted_at is null;

create index if not exists teacher_class_assignments_class_idx
    on public.teacher_class_assignments (class_id)
    where deleted_at is null;

create index if not exists teacher_class_assignments_semester_idx
    on public.teacher_class_assignments (semester_id)
    where deleted_at is null;

create or replace function public.set_teacher_class_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_teacher_class_assignments_updated_at on public.teacher_class_assignments;
create trigger trg_teacher_class_assignments_updated_at
before update on public.teacher_class_assignments
for each row
execute function public.set_teacher_class_assignments_updated_at();

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles
        where user_id = p_user_id
          and role = 'admin'
          and deleted_at is null
    );
$$;

create or replace function public.has_teacher_class_assignment(
    p_user_id uuid,
    p_class_id uuid,
    p_semester_id uuid default null,
    p_roles text[] default array['homeroom', 'subject_teacher'],
    p_subject text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.teacher_class_assignments assignment
        where assignment.teacher_user_id = p_user_id
          and assignment.class_id = p_class_id
          and assignment.deleted_at is null
          and assignment.assignment_role = any(p_roles)
          and (p_semester_id is null or assignment.semester_id = p_semester_id)
          and (
              p_subject is null
              or assignment.assignment_role = 'homeroom'
              or lower(assignment.subject_name) = lower(p_subject)
          )
    );
$$;

create or replace function public.can_access_student_roster(
    p_user_id uuid,
    p_class_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        public.is_admin_user(p_user_id)
        or exists (
            select 1
            from public.classes c
            where c.id = p_class_id
              and c.user_id = p_user_id
              and c.deleted_at is null
        )
        or public.has_teacher_class_assignment(
            p_user_id,
            p_class_id,
            null,
            array['homeroom', 'subject_teacher'],
            null
        );
$$;

create or replace function public.can_access_student_grade_record(
    p_user_id uuid,
    p_student_id uuid,
    p_semester_id uuid,
    p_subject text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.students s
        where s.id = p_student_id
          and s.deleted_at is null
          and (
              public.is_admin_user(p_user_id)
              or s.user_id = p_user_id
              or public.has_teacher_class_assignment(
                  p_user_id,
                  s.class_id,
                  p_semester_id,
                  array['homeroom', 'subject_teacher'],
                  p_subject
              )
          )
    );
$$;

create or replace function public.can_access_student_behavior_record(
    p_user_id uuid,
    p_student_id uuid,
    p_semester_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.students s
        where s.id = p_student_id
          and s.deleted_at is null
          and (
              public.is_admin_user(p_user_id)
              or s.user_id = p_user_id
              or public.has_teacher_class_assignment(
                  p_user_id,
                  s.class_id,
                  p_semester_id,
                  array['homeroom'],
                  null
              )
          )
    );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;
grant execute on function public.has_teacher_class_assignment(uuid, uuid, uuid, text[], text) to authenticated;
grant execute on function public.can_access_student_roster(uuid, uuid) to authenticated;
grant execute on function public.can_access_student_grade_record(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.can_access_student_behavior_record(uuid, uuid, uuid) to authenticated;

alter table if exists public.teacher_class_assignments enable row level security;

drop policy if exists "Admins can manage teacher class assignments" on public.teacher_class_assignments;
create policy "Admins can manage teacher class assignments"
    on public.teacher_class_assignments
    for all
    using (public.is_admin_user(auth.uid()))
    with check (public.is_admin_user(auth.uid()));

drop policy if exists "Teachers can read own class assignments" on public.teacher_class_assignments;
create policy "Teachers can read own class assignments"
    on public.teacher_class_assignments
    for select
    using (teacher_user_id = auth.uid());

drop policy if exists "Teachers can view assigned classes" on public.classes;
create policy "Teachers can view assigned classes"
    on public.classes
    for select
    using (
        public.can_access_student_roster(auth.uid(), id)
    );

drop policy if exists "Teachers can view assigned students" on public.students;
create policy "Teachers can view assigned students"
    on public.students
    for select
    using (
        public.can_access_student_roster(auth.uid(), class_id)
    );

drop policy if exists "Teachers can read accessible academic records" on public.academic_records;
create policy "Teachers can read accessible academic records"
    on public.academic_records
    for select
    using (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can insert assigned academic records" on public.academic_records;
create policy "Teachers can insert assigned academic records"
    on public.academic_records
    for insert
    with check (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can update own assigned academic records" on public.academic_records;
create policy "Teachers can update own assigned academic records"
    on public.academic_records
    for update
    using (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    )
    with check (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can delete own assigned academic records" on public.academic_records;
create policy "Teachers can delete own assigned academic records"
    on public.academic_records
    for delete
    using (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can read accessible quiz points" on public.quiz_points;
create policy "Teachers can read accessible quiz points"
    on public.quiz_points
    for select
    using (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can insert assigned quiz points" on public.quiz_points;
create policy "Teachers can insert assigned quiz points"
    on public.quiz_points
    for insert
    with check (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can update own assigned quiz points" on public.quiz_points;
create policy "Teachers can update own assigned quiz points"
    on public.quiz_points
    for update
    using (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    )
    with check (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Teachers can delete own assigned quiz points" on public.quiz_points;
create policy "Teachers can delete own assigned quiz points"
    on public.quiz_points
    for delete
    using (
        auth.uid() = user_id
        and public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

drop policy if exists "Homeroom teachers can read accessible attendance" on public.attendance;
create policy "Homeroom teachers can read accessible attendance"
    on public.attendance
    for select
    using (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can insert accessible attendance" on public.attendance;
create policy "Homeroom teachers can insert accessible attendance"
    on public.attendance
    for insert
    with check (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can update own accessible attendance" on public.attendance;
create policy "Homeroom teachers can update own accessible attendance"
    on public.attendance
    for update
    using (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    )
    with check (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can delete own accessible attendance" on public.attendance;
create policy "Homeroom teachers can delete own accessible attendance"
    on public.attendance
    for delete
    using (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can read accessible violations" on public.violations;
create policy "Homeroom teachers can read accessible violations"
    on public.violations
    for select
    using (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can insert accessible violations" on public.violations;
create policy "Homeroom teachers can insert accessible violations"
    on public.violations
    for insert
    with check (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can update own accessible violations" on public.violations;
create policy "Homeroom teachers can update own accessible violations"
    on public.violations
    for update
    using (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    )
    with check (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can delete own accessible violations" on public.violations;
create policy "Homeroom teachers can delete own accessible violations"
    on public.violations
    for delete
    using (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

drop policy if exists "Homeroom teachers can read accessible reports" on public.reports;
create policy "Homeroom teachers can read accessible reports"
    on public.reports
    for select
    using (
        exists (
            select 1
            from public.students s
            where s.id = reports.student_id
              and s.deleted_at is null
              and public.can_access_student_behavior_record(auth.uid(), s.id, null)
        )
    );

insert into public.teacher_class_assignments (
    teacher_user_id,
    class_id,
    semester_id,
    assignment_role,
    subject_name,
    notes,
    created_by
)
select
    c.user_id,
    c.id,
    s.id,
    'homeroom',
    null,
    'Auto-seeded dari pemilik kelas yang sudah ada',
    c.user_id
from public.classes c
join public.semesters s
    on s.user_id = c.user_id
where c.deleted_at is null
on conflict do nothing;

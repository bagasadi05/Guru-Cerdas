-- Migration: Multi-teacher attendance with teacher_status + official_status
-- Memungkinkan tiap guru absen per siswa per hari, dengan status resmi
-- ditetapkan oleh wali kelas.

-- 1. Kolom teacher_status (diisi guru yg ngabsen)
alter table if exists public.attendance
    add column if not exists teacher_id uuid references auth.users(id),
    add column if not exists teacher_status public.attendance_status;

-- 2. Kolom official_status (diisi wali kelas/admin sbg status resmi)
alter table if exists public.attendance
    add column if not exists official_status public.attendance_status,
    add column if not exists official_by uuid references auth.users(id),
    add column if not exists official_at timestamptz;

-- 3. Backfill: existing records → teacher_status = status, teacher_id = user_id
update public.attendance
set
    teacher_status = status,
    teacher_id = user_id
where teacher_status is null;

-- 4. Alter unique constraint: 1 record per teacher per student per day
drop index if exists public.attendance_unique_student_date;
create unique index if not exists attendance_teacher_daily_idx
    on public.attendance (student_id, date, teacher_id)
    where deleted_at is null;

-- 5. RPC: get official or majority teacher_status for rekap
create or replace function public.get_attendance_status(
    p_student_id uuid,
    p_date date
)
returns public.attendance_status
language sql
stable
set search_path = public
as $$
    select coalesce(
        -- priority 1: official_status
        (select a.official_status
         from public.attendance a
         where a.student_id = p_student_id
           and a.date = p_date
           and a.deleted_at is null
           and a.official_status is not null
         limit 1),
        -- priority 2: majority teacher_status
        (select a.teacher_status
         from public.attendance a
         where a.student_id = p_student_id
           and a.date = p_date
           and a.deleted_at is null
           and a.teacher_status is not null
         group by a.teacher_status
         order by count(*) desc
         limit 1)
    ) as status;
$$;

grant execute on function public.get_attendance_status(uuid, date) to authenticated;

-- 6. Update RLS: tambah subject_teacher ke attendance
-- Hapus policy lama yang cuma homeroom
drop policy if exists "Homeroom teachers can read accessible attendance" on public.attendance;
drop policy if exists "Homeroom teachers can insert accessible attendance" on public.attendance;
drop policy if exists "Homeroom teachers can update own accessible attendance" on public.attendance;
drop policy if exists "Homeroom teachers can delete own accessible attendance" on public.attendance;

-- Update can_access_student_behavior_record biar termasuk subject_teacher
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
                  array['homeroom', 'subject_teacher'], -- ← ditambah subject_teacher
                  null
              )
          )
    );
$$;

-- Recreate policies for attendance (teacher_status)
create policy "Teachers can read accessible attendance"
    on public.attendance
    for select
    using (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

create policy "Teachers can insert accessible attendance"
    on public.attendance
    for insert
    with check (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

create policy "Teachers can update own accessible attendance"
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

create policy "Teachers can delete own accessible attendance"
    on public.attendance
    for delete
    using (
        auth.uid() = user_id
        and public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

-- 7. Policy: hanya wali kelas & admin bisa set official_status
create policy "Homeroom can set official status"
    on public.attendance
    for update
    using (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(),
            (select class_id from public.students where id = student_id),
            null,
            array['homeroom'],
            null
        )
    )
    with check (
        -- hanya boleh update kolom official_*
        (official_status is not distinct from official_status)
        and (official_by is not distinct from official_by)
        and (official_at is not distinct from official_at)
    );

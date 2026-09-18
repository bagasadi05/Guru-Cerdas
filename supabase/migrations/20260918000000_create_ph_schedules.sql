-- Jadwal Penilaian Harian (PH)
-- Guru (walas) bisa CRUD jadwal PH untuk kelasnya, semua guru bisa lihat.

create table if not exists public.ph_schedules (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references public.classes(id) on delete cascade,
    semester_id uuid not null references public.semesters(id) on delete cascade,
    subject text not null,
    date date not null,
    period_label text not null,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists ph_schedules_class_semester_idx
    on public.ph_schedules (class_id, semester_id)
    where deleted_at is null;

create index if not exists ph_schedules_date_idx
    on public.ph_schedules (date)
    where deleted_at is null;

create or replace function public.set_ph_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_ph_schedules_updated_at on public.ph_schedules;
create trigger trg_ph_schedules_updated_at
before update on public.ph_schedules
for each row
execute function public.set_ph_schedules_updated_at();

alter table public.ph_schedules enable row level security;

-- Semua authenticated users bisa baca semua jadwal PH
drop policy if exists "All teachers can read PH schedules" on public.ph_schedules;
create policy "All teachers can read PH schedules"
    on public.ph_schedules
    for select
    to authenticated
    using (true);

-- Walas (homeroom) atau admin bisa insert
drop policy if exists "Walas can insert PH schedules" on public.ph_schedules;
create policy "Walas can insert PH schedules"
    on public.ph_schedules
    for insert
    to authenticated
    with check (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom'], null
        )
    );

-- Walas atau admin bisa update
drop policy if exists "Walas can update PH schedules" on public.ph_schedules;
create policy "Walas can update PH schedules"
    on public.ph_schedules
    for update
    to authenticated
    using (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom'], null
        )
    )
    with check (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom'], null
        )
    );

-- Walas atau admin bisa soft-delete
drop policy if exists "Walas can delete PH schedules" on public.ph_schedules;
create policy "Walas can delete PH schedules"
    on public.ph_schedules
    for delete
    to authenticated
    using (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom'], null
        )
    );

-- Baseline legacy schema migration
-- Ensures all 19 historical core tables have explicit CREATE TABLE statements
-- Idempotent using IF NOT EXISTS

-- 1. academic_years
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 2. semesters
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  name text not null,
  semester_number integer,
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  is_locked boolean default false,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 3. classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  grade_level text,
  academic_year text,
  wali_kelas_id uuid references auth.users(id) on delete set null,
  is_archived boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 4. students
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete set null,
  name text not null,
  nis text,
  nisn text,
  gender text,
  birth_date date,
  parent_name text,
  parent_phone text,
  access_code text,
  avatar_url text,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 5. academic_records
create table if not exists public.academic_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  subject text not null,
  assessment_name text,
  score numeric not null,
  notes text default '' not null,
  semester_id uuid references public.semesters(id) on delete set null,
  version integer default 1,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 6. attendance
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  status text not null,
  notes text,
  semester_id uuid references public.semesters(id) on delete set null,
  teacher_id uuid references auth.users(id) on delete set null,
  teacher_status text,
  official_status text,
  official_by uuid references auth.users(id) on delete set null,
  official_at timestamptz,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 7. attendance_archive
create table if not exists public.attendance_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  semester_id uuid references public.semesters(id) on delete set null,
  original_semester_id uuid,
  date date not null,
  status text not null,
  notes text,
  archived_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 8. communications
create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  teacher_id uuid references auth.users(id) on delete set null,
  parent_id uuid references auth.users(id) on delete set null,
  sender text not null,
  message text not null,
  is_read boolean default false not null,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 9. homework
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  teacher_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subject text not null,
  description text,
  due_date date not null,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 10. internal_notifications
create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'info' not null,
  action_url text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- 11. lesson_plans
create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  identity jsonb,
  curriculum_approach text,
  document_type text,
  generation_method text,
  generated_content jsonb,
  components jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 12. quiz_points
create table if not exists public.quiz_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  quiz_name text not null,
  subject text not null,
  quiz_date date not null,
  points numeric not null,
  max_points numeric default 100 not null,
  category text,
  semester_id uuid references public.semesters(id) on delete set null,
  is_used boolean default false,
  used_for_subject text,
  used_at timestamptz,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 13. ref_capaian_pembelajaran
create table if not exists public.ref_capaian_pembelajaran (
  id uuid primary key default gen_random_uuid(),
  fase text not null,
  mata_pelajaran text not null,
  elemen text not null,
  deskripsi_cp text not null,
  sumber_regulasi text,
  tahun text,
  is_verified boolean default true,
  created_at timestamptz default now() not null
);

-- 14. ref_model_pembelajaran
create table if not exists public.ref_model_pembelajaran (
  id uuid primary key default gen_random_uuid(),
  nama_model text not null,
  kategori text,
  sintaks_pendahuluan jsonb,
  sintaks_inti jsonb,
  sintaks_penutup jsonb,
  kelebihan jsonb,
  kekurangan jsonb,
  cocok_untuk jsonb,
  sumber text,
  created_at timestamptz default now() not null
);

-- 15. reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  title text not null,
  category text not null,
  date date not null,
  notes text,
  attachment_url text,
  tags text[],
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 16. schedules
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete cascade not null,
  subject text not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  room text,
  reminded boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 17. school_info
create table if not exists public.school_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  school_name text not null,
  school_address text,
  school_phone text,
  school_email text,
  principal_name text,
  principal_nip text,
  logo_url text,
  academic_year text,
  semester text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 18. tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean default false,
  status text default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 19. violations
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  semester_id uuid references public.semesters(id) on delete set null,
  date date not null,
  type text,
  description text not null,
  points numeric default 0 not null,
  severity text,
  context_notes text,
  follow_up_status text,
  follow_up_notes text,
  evidence_url text,
  parent_notified boolean default false,
  parent_notified_at timestamptz,
  created_at timestamptz default now() not null,
  deleted_at timestamptz
);

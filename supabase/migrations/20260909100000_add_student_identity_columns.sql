-- Add student identity columns: NIS, NISN, and birth date
-- These columns support Indonesian school student master records and ID Card generation

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS nis TEXT,
ADD COLUMN IF NOT EXISTS nisn TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.students.nis IS 'Nomor Induk Siswa (local school ID)';
COMMENT ON COLUMN public.students.nisn IS 'Nomor Induk Siswa Nasional (national student ID)';
COMMENT ON COLUMN public.students.birth_date IS 'Tanggal lahir siswa';

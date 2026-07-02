-- ROLLBACK: sekolah multi-tenant (over-engineered untuk 1 sekolah)
DROP TABLE IF EXISTS public.school_members CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;
ALTER TABLE public.classes DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.students DROP COLUMN IF EXISTS school_id;
DROP FUNCTION IF EXISTS public.get_available_teachers;

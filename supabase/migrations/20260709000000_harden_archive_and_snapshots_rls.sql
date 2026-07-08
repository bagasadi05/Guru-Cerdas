-- Migration: Harden Row Level Security for attendance_archive and storage_usage_snapshots
-- Description: Enable RLS and add basic select policies to resolve Supabase security issues

-- 1. attendance_archive
ALTER TABLE IF EXISTS public.attendance_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read accessible archived attendance" ON public.attendance_archive;
CREATE POLICY "Teachers can read accessible archived attendance"
    ON public.attendance_archive
    FOR SELECT
    USING (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

-- 2. storage_usage_snapshots
ALTER TABLE IF EXISTS public.storage_usage_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view storage usage snapshots" ON public.storage_usage_snapshots;
CREATE POLICY "Admins can view storage usage snapshots"
    ON public.storage_usage_snapshots
    FOR SELECT
    USING (
        public.is_admin_user(auth.uid())
    );

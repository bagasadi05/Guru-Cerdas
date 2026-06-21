-- ============================================
-- Migration: Create Teaching Journals (Jurnal Mengajar / Agenda KBM)
-- Created: 2026-06-21
-- Description: Structured daily teaching journal for teachers — class, subject,
--              meeting number, topic, objectives, activities, notes, and
--              optional attachment. Integrates with schedules and dashboard.
-- ============================================

-- 1. Create teaching_journals table
CREATE TABLE IF NOT EXISTS public.teaching_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    date DATE NOT NULL,
    meeting_number INT,
    topic TEXT NOT NULL,
    objectives TEXT,
    activities TEXT,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Composite index for common filter patterns (user + class + date)
CREATE INDEX IF NOT EXISTS idx_teaching_journals_user_class_date
    ON public.teaching_journals(user_id, class_id, date);

-- Additional index for date-range queries
CREATE INDEX IF NOT EXISTS idx_teaching_journals_user_date
    ON public.teaching_journals(user_id, date);

-- 3. Enable Row Level Security
ALTER TABLE public.teaching_journals ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy: only the owning teacher can manage their own rows
DROP POLICY IF EXISTS "Users can manage their own teaching journals" ON public.teaching_journals;

CREATE POLICY "Users can manage their own teaching journals"
ON public.teaching_journals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_teaching_journals_updated_at ON public.teaching_journals;

CREATE TRIGGER update_teaching_journals_updated_at
BEFORE UPDATE ON public.teaching_journals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Storage policies for teaching_journals folder in student_assets bucket
-- ============================================

-- 6. Ensure the student_assets bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('student_assets', 'student_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policy: INSERT
DROP POLICY IF EXISTS "teaching_journals_insert" ON storage.objects;
CREATE POLICY "teaching_journals_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'student_assets'
    AND (storage.foldername(name))[1] = 'teaching_journals'
);

-- 8. Storage policy: SELECT
DROP POLICY IF EXISTS "teaching_journals_select" ON storage.objects;
CREATE POLICY "teaching_journals_select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'student_assets'
    AND (storage.foldername(name))[1] = 'teaching_journals'
);

-- 9. Storage policy: UPDATE
DROP POLICY IF EXISTS "teaching_journals_update" ON storage.objects;
CREATE POLICY "teaching_journals_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'student_assets'
    AND (storage.foldername(name))[1] = 'teaching_journals'
)
WITH CHECK (
    bucket_id = 'student_assets'
    AND (storage.foldername(name))[1] = 'teaching_journals'
);

-- 10. Storage policy: DELETE
DROP POLICY IF EXISTS "teaching_journals_delete" ON storage.objects;
CREATE POLICY "teaching_journals_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'student_assets'
    AND (storage.foldername(name))[1] = 'teaching_journals'
);

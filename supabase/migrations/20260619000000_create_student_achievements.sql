-- ============================================
-- Migration: Create Student Achievements (Portofolio Prestasi Siswa)
-- Created: 2026-06-19
-- Description: Structured records of students who won competitions (lomba),
--              including category, level, rank, organizer, date, and a
--              reference to the certificate file. This is distinct from the
--              free-text `prestasi` category in `reports`; it is a dedicated,
--              queryable achievement portfolio per student.
-- ============================================

-- 1. Create student_achievements table
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'lainnya',
    level TEXT NOT NULL DEFAULT 'sekolah',
    rank TEXT,
    organizer TEXT,
    date DATE NOT NULL,
    description TEXT,
    certificate_url TEXT,
    certificate_name TEXT,
    points INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_student_achievements_user_id ON public.student_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_date ON public.student_achievements(date);

-- 3. Enable Row Level Security
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy: only the owning teacher can manage their rows
DROP POLICY IF EXISTS "Users can manage their own student achievements" ON public.student_achievements;

CREATE POLICY "Users can manage their own student achievements"
ON public.student_achievements
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_student_achievements_updated_at ON public.student_achievements;

CREATE TRIGGER update_student_achievements_updated_at
BEFORE UPDATE ON public.student_achievements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Value constraints to keep enum-like columns consistent with the app
ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_category_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_category_check
    CHECK (category IN ('akademik','non_akademik','seni','olahraga','keagamaan','lainnya'));

ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_level_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_level_check
    CHECK (level IN ('sekolah','kecamatan','kabupaten_kota','provinsi','nasional','internasional'));

ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_rank_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_rank_check
    CHECK (rank IS NULL OR rank IN ('juara_1','juara_2','juara_3','harapan','finalis','partisipan'));

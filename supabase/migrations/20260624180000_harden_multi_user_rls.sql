-- ============================================
-- Migration: Harden Row Level Security for Multi-User Collaborative Workspace
-- Created: 2026-06-24
-- Description: Extends SELECT policies for student achievements, development analyses,
--              teaching journals, and student extracurriculars so they are visible
--              to any teacher with class access (via can_access_student_roster)
--              in a shared multi-teacher environment.
--              Maintains strict INSERT/UPDATE/DELETE access to the owner/creator.
-- ============================================

-- 1. Hardening public.student_achievements
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read student achievements if in roster" ON public.student_achievements;
CREATE POLICY "Users can read student achievements if in roster"
ON public.student_achievements
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_achievements.student_id
          AND public.can_access_student_roster(auth.uid(), s.class_id)
    )
);

-- Ensure write access remains restricted to creator (or admin)
DROP POLICY IF EXISTS "Users can manage their own student achievements" ON public.student_achievements;
CREATE POLICY "Users can manage their own student achievements"
ON public.student_achievements
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 2. Hardening public.student_development_analyses
ALTER TABLE public.student_development_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read student analyses if in roster" ON public.student_development_analyses;
CREATE POLICY "Users can read student analyses if in roster"
ON public.student_development_analyses
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_development_analyses.student_id
          AND public.can_access_student_roster(auth.uid(), s.class_id)
    )
);

-- Ensure write access remains restricted to creator
DROP POLICY IF EXISTS "Users can manage their own student development analyses" ON public.student_development_analyses;
CREATE POLICY "Users can manage their own student development analyses"
ON public.student_development_analyses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 3. Hardening public.teaching_journals
ALTER TABLE public.teaching_journals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read teaching journals if in roster" ON public.teaching_journals;
CREATE POLICY "Users can read teaching journals if in roster"
ON public.teaching_journals
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (class_id IS NOT NULL AND public.can_access_student_roster(auth.uid(), class_id))
);

-- Ensure write access remains restricted to creator
DROP POLICY IF EXISTS "Users can manage their own teaching journals" ON public.teaching_journals;
CREATE POLICY "Users can manage their own teaching journals"
ON public.teaching_journals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 4. Hardening public.extracurriculars
ALTER TABLE public.extracurriculars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all extracurriculars" ON public.extracurriculars;
CREATE POLICY "Authenticated users can view all extracurriculars"
ON public.extracurriculars
FOR SELECT
TO authenticated
USING (true);


-- 5. Hardening public.student_extracurriculars
ALTER TABLE public.student_extracurriculars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read student extracurriculars if in roster" ON public.student_extracurriculars;
CREATE POLICY "Users can read student extracurriculars if in roster"
ON public.student_extracurriculars
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_extracurriculars.student_id
          AND public.can_access_student_roster(auth.uid(), s.class_id)
    ))
);


-- 6. Hardening public.extracurricular_attendance
ALTER TABLE public.extracurricular_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read extracurricular attendance if in roster" ON public.extracurricular_attendance;
CREATE POLICY "Users can read extracurricular attendance if in roster"
ON public.extracurricular_attendance
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = extracurricular_attendance.student_id
          AND public.can_access_student_roster(auth.uid(), s.class_id)
    ))
);


-- 7. Hardening public.extracurricular_grades
ALTER TABLE public.extracurricular_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read extracurricular grades if in roster" ON public.extracurricular_grades;
CREATE POLICY "Users can read extracurricular grades if in roster"
ON public.extracurricular_grades
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = extracurricular_grades.student_id
          AND public.can_access_student_roster(auth.uid(), s.class_id)
    ))
);

-- Migration: Shared RLS for academic records and quiz points
-- Tujuan: Mengizinkan semua guru yang memiliki akses mengajar (Wali Kelas / Guru Mapel)
-- untuk memperbarui atau menghapus nilai yang sudah ada (kolaborasi).

-- ==========================================
-- 1. Tabel: academic_records
-- ==========================================
DROP POLICY IF EXISTS "Teachers can update own assigned academic records" ON public.academic_records;
DROP POLICY IF EXISTS "Teachers can delete own assigned academic records" ON public.academic_records;

CREATE POLICY "Teachers can update assigned academic records"
    ON public.academic_records
    FOR UPDATE
    USING (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    )
    WITH CHECK (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

CREATE POLICY "Teachers can delete assigned academic records"
    ON public.academic_records
    FOR DELETE
    USING (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );


-- ==========================================
-- 2. Tabel: quiz_points
-- ==========================================
DROP POLICY IF EXISTS "Teachers can update own assigned quiz points" ON public.quiz_points;
DROP POLICY IF EXISTS "Teachers can delete own assigned quiz points" ON public.quiz_points;

CREATE POLICY "Teachers can update assigned quiz points"
    ON public.quiz_points
    FOR UPDATE
    USING (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    )
    WITH CHECK (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

CREATE POLICY "Teachers can delete assigned quiz points"
    ON public.quiz_points
    FOR DELETE
    USING (
        public.can_access_student_grade_record(auth.uid(), student_id, semester_id, subject)
    );

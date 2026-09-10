-- =============================================================================
-- Migration: 20260910010000_bintang_evaluations_unpublish_policy
-- Tanggal  : 2026-09-10
-- Tujuan   : Mengizinkan pembatalan publikasi (unpublish / kembalikan ke draft)
--            oleh wali kelas, evaluator, atau pimpinan sekolah sehingga rapor
--            yang telah dipublikasikan dapat diedit kembali jika diperlukan.
--
-- Policy baru:
--   "Evaluations: unpublish to draft" — mengubah baris yang sudah published
--   (USING: is_published = true) kembali menjadi draft (WITH CHECK: is_published = false).
--
-- Sifat: IDEMPOTENT.
-- =============================================================================

DROP POLICY IF EXISTS "Evaluations: unpublish to draft" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: unpublish to draft"
    ON public.bintang_monthly_evaluations
    FOR UPDATE
    TO authenticated
    USING (
        is_published = true
        AND (
            auth.uid() = evaluator_id
            OR public.is_leadership(auth.uid())
            OR EXISTS (
                SELECT 1
                FROM public.teacher_class_assignments tca
                JOIN public.students s ON s.class_id = tca.class_id
                WHERE s.id = bintang_monthly_evaluations.student_id
                  AND tca.teacher_user_id = auth.uid()
                  AND tca.assignment_role = 'homeroom'
                  AND tca.deleted_at IS NULL
            )
        )
    )
    WITH CHECK (
        is_published = false
        AND (
            auth.uid() = evaluator_id
            OR public.is_leadership(auth.uid())
            OR EXISTS (
                SELECT 1
                FROM public.teacher_class_assignments tca
                JOIN public.students s ON s.class_id = tca.class_id
                WHERE s.id = bintang_monthly_evaluations.student_id
                  AND tca.teacher_user_id = auth.uid()
                  AND tca.assignment_role = 'homeroom'
                  AND tca.deleted_at IS NULL
            )
        )
    );

-- =============================================================================
-- Migration: 20260815000001_bintang_published_eval_immutable
-- Tanggal : 2026-08-15
-- Tujuan : Enforce immutability rapor BINTANG yang sudah dipublikasikan di
--          level RLS (bukan hanya disable tombol di client).
--
-- Sebelumnya: policy UPDATE "Evaluations: evaluator, admin, or homeroom can
--             update" mengizinkan mengubah baris yang sudah is_published = true
--             selama user-nya evaluator/pimpinan/wali kelas. UI men-disable tombol
--             edit, tapi siapa pun dengan akses API bisa mengubah rapor terbit.
--
-- Sekarang: 2 policy UPDATE dengan semantik OR di PostgreSQL RLS:
--   1. "Evaluations: edit draft only"      — boleh mengubah baris yang BELUM
--      dipublikasikan (is_published = false). Setelah published, baris terkunci.
--   2. "Evaluations: publish draft"        — satu-satunya jalan mengubah baris
--      draft menjadi published (UPDATE is_published false -> true). Ini menjaga
--      alur publishEvaluations() tetap jalan tanpa membuka pintu edit konten.
--
-- Catatan: PostgreSQL RLS `FOR UPDATE` mengevaluasi semua policy UPDATE (OR).
--   - Baris draft: policy 1 lolos (is_published = false) -> bisa diedit & dipublish.
--   - Baris published: policy 1 gagal, policy 2 hanya lolos jika NEW.is_published
--     = true DAN user berhak — artinya satu-satunya UPDATE yang lolos adalah
--     yang mempertahankan published = true (no-op), bukan mengubah konten.
--     (UPDATE konten pada baris published akan punya NEW.is_published = true dan
--     tetap lolos policy 2 bila user berhak — keterbatasan RLS kolom-level.
--     Untuk penguncian penuh, client-side tetap men-disable edit; RLS ini
--     menutup celah "siapa pun bisa edit lewat API", level perlindungan yang
--     realistis untuk aplikasi ini.)
--
-- Sifat: IDEMPOTENT.
-- =============================================================================

DROP POLICY IF EXISTS "Evaluations: edit draft only" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: edit draft only"
    ON public.bintang_monthly_evaluations
    FOR UPDATE
    TO authenticated
    USING (
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

DROP POLICY IF EXISTS "Evaluations: publish draft" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: publish draft"
    ON public.bintang_monthly_evaluations
    FOR UPDATE
    TO authenticated
    USING (
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
    )
    WITH CHECK (
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
    );

-- Policy lama diganti total (dihapus agar tidak jadi jalur bypass).
DROP POLICY IF EXISTS "Evaluations: evaluator, admin, or homeroom can update" ON public.bintang_monthly_evaluations;

-- =============================================================================
-- Migration: restrict_published_bintang_read
-- Tanggal  : 2026-10-04
--
-- Sebelumnya cabang `OR is_published = true` membuat SEMUA pengguna yang login
-- bisa membaca rapor BINTANG terbit (termasuk catatan wali kelas) seluruh
-- siswa. Cabang itu dulu dibutuhkan Portal Orang Tua, yang kini membaca lewat
-- RPC get_student_portal_bintang (migrasi 20261003132636).
--
-- Rapor terbit kini hanya terbaca oleh:
--   - evaluator, pimpinan, wali kelas (tidak berubah),
--   - guru yang punya penugasan aktif di kelas siswa (wali, guru mapel, asisten),
--   - guru pembuat data siswa (students.user_id).
-- auth.uid() dibungkus SELECT agar dievaluasi sekali per query (advisor
-- auth_rls_initplan).
--
-- Policy diganti (DROP + CREATE); tidak ada data yang diubah.
-- =============================================================================

DROP POLICY IF EXISTS "Evaluations: evaluator, admin, leadership, or homeroom select" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: evaluator, admin, leadership, or homeroom select"
    ON public.bintang_monthly_evaluations
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = evaluator_id
        OR public.is_leadership((SELECT auth.uid()))
        OR EXISTS (
            SELECT 1
            FROM public.teacher_class_assignments tca
            JOIN public.students s ON s.class_id = tca.class_id
            WHERE s.id = bintang_monthly_evaluations.student_id
              AND tca.teacher_user_id = (SELECT auth.uid())
              AND tca.assignment_role = 'homeroom'
              AND tca.deleted_at IS NULL
        )
        OR (
            is_published = true
            AND EXISTS (
                SELECT 1
                FROM public.students s
                WHERE s.id = bintang_monthly_evaluations.student_id
                  AND (
                      s.user_id = (SELECT auth.uid())
                      OR EXISTS (
                          SELECT 1
                          FROM public.teacher_class_assignments tca
                          WHERE tca.class_id = s.class_id
                            AND tca.teacher_user_id = (SELECT auth.uid())
                            AND tca.deleted_at IS NULL
                      )
                  )
            )
        )
    );

-- =============================================================================
-- Migration: 20260803000000_harden_bintang_eval_and_admin_write_rls
-- Tanggal : 2026-08-03
-- Tujuan : Menutup 4 celah RLS yang ditemukan saat audit menu utama:
--
--   1. bintang_monthly_evaluations
--      Sebelumnya: "Teachers can manage evaluations" FOR ALL USING
--      (auth.uid() IN (SELECT id FROM auth.users)) -> SEMUA user terautentikasi
--      bisa SELECT/INSERT/UPDATE/DELETE evaluasi bulanan siswa mana pun.
--      Sekarang: SELECT dibatasi ke evaluator / admin / leadership (pimpinan
--      madrasah & waka kesiswaan = peran evaluator KESISWAAN/KEPSEK di program
--      Bintang) / wali kelas; akses tulis dibatasi ke evaluator, admin, wali.
--      Evaluasi yang SUDAH is_published = true tetap bisa dibaca user
--      terautentikasi (portal orang tua membaca langsung dari client, bukan RPC).
--
--   2. internal_notifications
--      Sebelumnya: hanya SELECT own + DELETE own. Client (useInternalNotifications)
--      melakukan UPDATE is_read -> selalu ditolak RLS.
--      Sekarang: tambah policy UPDATE own (mark as read).
--
--   3. announcements
--      Sebelumnya: hanya "Allow public read announcements" (SELECT true).
--      AdminPage melakukan INSERT + softDelete (UPDATE deleted_at) -> ditolak RLS.
--      Sekarang: tambah policy INSERT/UPDATE/DELETE khusus admin.
--
--   4. audit_logs
--      Sebelumnya: hanya SELECT own + INSERT own -> tab "Aktivitas" admin hanya
--      menampilkan log admin itu sendiri.
--      Sekarang: tambah policy admin membaca semua audit log.
--
--   5. extracurricular_students (bonus dari audit yang sama)
--      Tidak tercakup leadership_read_rls (20260626120000) -> pimpinan tidak
--      bisa membaca data siswa ekstrakurikuler-only.
--      Sekarang: tambah policy SELECT leadership, mengikuti pola leadership_read_*.
--
-- Catatan alur aplikasi yang dipertahankan:
--   - bintangService.upsertEvaluation/bulkUpsertEvaluations memakai
--     UPSERT ON CONFLICT (student_id, month) -> policy INSERT dan UPDATE
--     HARUS lolos untuk wali kelas yang sah (evaluator_id = auth.uid()).
--   - bintangService.publishEvaluations -> UPDATE is_published oleh wali kelas.
--   - ParentPortalPage membaca bintang_monthly_evaluations is_published = true
--     LANGSUNG dari client -> butuh policy SELECT untuk evaluasi terpublikasi.
--
-- Sifat: IDEMPOTENT. Semua statement memakai DROP POLICY IF EXISTS sebelum CREATE.
-- =============================================================================

-- =============================================================================
-- 1. bintang_monthly_evaluations — batasi ke evaluator / admin / leadership / wali
-- =============================================================================

-- Hapus policy lama (nama aktual di produksi berbeda dari yang diduga sebelumnya)
DROP POLICY IF EXISTS "Teachers can manage evaluations" ON public.bintang_monthly_evaluations;
DROP POLICY IF EXISTS "Allow all access to bintang_monthly_evaluations" ON public.bintang_monthly_evaluations;

-- SELECT: pembuat evaluasi, admin, pimpinan (is_leadership mencakup admin),
--         wali kelas siswa, ATAU evaluasi yang sudah dipublikasikan
--         (dibaca portal orang tua).
DROP POLICY IF EXISTS "Evaluations: evaluator, admin, leadership, or homeroom select" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: evaluator, admin, leadership, or homeroom select"
    ON public.bintang_monthly_evaluations
    FOR SELECT
    TO authenticated
    USING (
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
        OR (is_published = true)
    );

-- INSERT: hanya evaluator itu sendiri, dan ia harus admin/pimpinan/wali kelas
--         siswa tsb (program Bintang: WALAS, KESISWAAN, KEPSEK).
DROP POLICY IF EXISTS "Evaluations: evaluator can insert own" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: evaluator can insert own"
    ON public.bintang_monthly_evaluations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = evaluator_id
        AND (
            public.is_leadership(auth.uid())
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

-- UPDATE: pembuat evaluasi, pimpinan/admin (mencakup kepala_madrasah &
--         waka_kesiswaan = peran evaluator KEPSEK/KESISWAAN), atau wali kelas.
--         is_leadership dipakai (bukan is_admin_user saja) agar waka kesiswaan
--         yang memublikasikan evaluasi buatan wali kelas tidak ditolak RLS.
DROP POLICY IF EXISTS "Evaluations: evaluator, admin, or homeroom can update" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: evaluator, admin, or homeroom can update"
    ON public.bintang_monthly_evaluations
    FOR UPDATE
    TO authenticated
    USING (
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
    WITH CHECK (
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
    );

-- DELETE: pembuat evaluasi, pimpinan/admin, atau wali kelas.
DROP POLICY IF EXISTS "Evaluations: evaluator, admin, or homeroom can delete" ON public.bintang_monthly_evaluations;
CREATE POLICY "Evaluations: evaluator, admin, or homeroom can delete"
    ON public.bintang_monthly_evaluations
    FOR DELETE
    TO authenticated
    USING (
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
    );


-- =============================================================================
-- 2. internal_notifications — tambah policy UPDATE own (mark as read)
-- =============================================================================

-- Policy UPDATE sudah ada manual di produksi dengan nama berbeda, tapi tetap
-- kita buat ulang pakai nama standar idempotent.
DROP POLICY IF EXISTS "Users update own notifications" ON public.internal_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications (mark read)" ON public.internal_notifications;
CREATE POLICY "Users update own notifications"
    ON public.internal_notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 3. announcements — policy tulis khusus admin (INSERT/UPDATE/DELETE)
--    Policy baca publik (SELECT USING true) sengaja dipertahankan.
-- =============================================================================

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_user(auth.uid()))
    WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements"
    ON public.announcements
    FOR DELETE
    TO authenticated
    USING (public.is_admin_user(auth.uid()));


-- =============================================================================
-- 4. audit_logs — admin dapat membaca SEMUA audit log (tab Aktivitas)
--    Policy SELECT own + INSERT own yang sudah ada dipertahankan.
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin_user(auth.uid()));


-- =============================================================================
-- 5. extracurricular_students — leadership read (melengkapi leadership_read_rls)
--    Mengikuti pola policy `leadership_read_*` yang sudah ada.
-- =============================================================================

DROP POLICY IF EXISTS "leadership_read_extracurricular_students" ON public.extracurricular_students;
CREATE POLICY "leadership_read_extracurricular_students"
    ON public.extracurricular_students
    FOR SELECT
    TO authenticated
    USING (public.is_leadership(auth.uid()));

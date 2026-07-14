-- Migration: Allow homeroom teachers to update and delete violations for their students
-- Tujuan: Memberikan hak kepada Wali Kelas untuk bertindak sebagai verifikator (edit/hapus) pelanggaran 
-- yang dimasukkan oleh guru lain untuk siswa di kelas binaannya.

-- Hapus policy update/delete lama dari migrasi sebelumnya
DROP POLICY IF EXISTS "Violations: creator or admin can update" ON public.violations;
DROP POLICY IF EXISTS "Violations: creator or admin can delete" ON public.violations;

-- Buat policy UPDATE baru (Pembuat OR Admin OR Wali Kelas)
CREATE POLICY "Violations: creator, admin, or homeroom can update"
    ON public.violations
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1 
            FROM public.teacher_class_assignments tca 
            JOIN public.students s ON s.class_id = tca.class_id 
            WHERE s.id = violations.student_id 
              AND tca.teacher_user_id = auth.uid() 
              AND tca.assignment_role = 'homeroom' 
              AND tca.deleted_at IS NULL
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1 
            FROM public.teacher_class_assignments tca 
            JOIN public.students s ON s.class_id = tca.class_id 
            WHERE s.id = violations.student_id 
              AND tca.teacher_user_id = auth.uid() 
              AND tca.assignment_role = 'homeroom' 
              AND tca.deleted_at IS NULL
        )
    );

-- Buat policy DELETE baru (Pembuat OR Admin OR Wali Kelas)
CREATE POLICY "Violations: creator, admin, or homeroom can delete"
    ON public.violations
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1 
            FROM public.teacher_class_assignments tca 
            JOIN public.students s ON s.class_id = tca.class_id 
            WHERE s.id = violations.student_id 
              AND tca.teacher_user_id = auth.uid() 
              AND tca.assignment_role = 'homeroom' 
              AND tca.deleted_at IS NULL
        )
    );

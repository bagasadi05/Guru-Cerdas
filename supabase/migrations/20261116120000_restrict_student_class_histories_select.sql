-- Restrict direct SELECT on public.student_class_histories
--
-- Migration 20261027090000 granted USING (true) to all authenticated users,
-- letting any teacher read the class history of any student. The only client
-- reader today is src/services/gradePromotionService.ts (promotion history &
-- rollback view), so scope the policy to:
--   - admins,
--   - the teacher who executed the promotion batch (grade_promotion_batches.executed_by),
--   - homeroom teachers of the student's from/to classes.
--
-- Rapor/portal orang tua flows read student data through SECURITY DEFINER RPCs
-- and are unaffected by this policy change.
--
-- Rollback: drop this policy and recreate USING (true) (see 20261027090000:151-156).
-- NOTE: applying this file requires `supabase db push` (manual dispatch per repo
-- policy). No data is modified — policy definitions only.

DROP POLICY IF EXISTS "student_class_histories_select" ON public.student_class_histories;

CREATE POLICY "student_class_histories_select"
    ON public.student_class_histories
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.grade_promotion_batches b
            WHERE b.id = student_class_histories.batch_id
              AND b.executed_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.teacher_class_assignments tca
            WHERE tca.teacher_user_id = auth.uid()
              AND tca.assignment_role = 'homeroom'
              AND tca.deleted_at IS NULL
              AND tca.class_id IN (student_class_histories.from_class_id, student_class_histories.to_class_id)
        )
    );

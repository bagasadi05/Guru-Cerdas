-- Restrict direct SELECT on public.student_class_histories
--
-- Migration 20261027090000 granted USING (true) to all authenticated users,
-- letting any authenticated user read the class history of any student.
-- Client readers via direct PostgREST are in src/services/gradePromotionService.ts
-- (called by ReportPage.tsx via resolveHistoricalClassName for historical report cards,
-- plus promotion/rollback workflows). Portal orang tua reads student data through
-- SECURITY DEFINER RPCs and is unaffected by this policy change.
--
-- Scope direct SELECT (using InitPlan scalar subqueries) to:
--   - admins, leadership (kepala_madrasah, waka_kesiswaan), and waka_kurikulum,
--   - the user who executed the promotion batch (grade_promotion_batches.executed_by),
--   - the previous owner recorded on the history row (from_user_id) or current student owner,
--   - teachers/homeroom teachers of the from/to classes (via teacher_class_assignments or classes).
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
        public.is_admin_user((SELECT auth.uid()))
        OR public.is_leadership((SELECT auth.uid()))
        OR EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = (SELECT auth.uid())
              AND ur.role = 'waka_kurikulum'
              AND ur.deleted_at IS NULL
        )
        OR student_class_histories.from_user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.grade_promotion_batches b
            WHERE b.id = student_class_histories.batch_id
              AND b.executed_by = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1
            FROM public.students s
            WHERE s.id = student_class_histories.student_id
              AND s.user_id = (SELECT auth.uid())
              AND s.deleted_at IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM public.classes c
            WHERE c.id IN (student_class_histories.from_class_id, student_class_histories.to_class_id)
              AND (c.wali_kelas_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
              AND c.deleted_at IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM public.teacher_class_assignments tca
            WHERE tca.teacher_user_id = (SELECT auth.uid())
              AND tca.deleted_at IS NULL
              AND tca.class_id IN (student_class_histories.from_class_id, student_class_histories.to_class_id)
        )
    );

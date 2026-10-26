-- =============================================================================
-- Migration: 20261026140500_optimize_performance_indexes_and_rls.sql
-- Date     : 2026-10-26
-- Standard : Supabase & PostgreSQL Best Practices (query-, security-)
-- Focus    : High-impact composite partial indexes & RLS InitPlan optimization
--
-- 1. Index Optimizations:
--    - attendance (date, status) WHERE deleted_at IS NULL
--      Eliminates full table sequential scan (31,000+ rows) for global analytics.
--    - attendance (student_id, semester_id) WHERE deleted_at IS NULL
--      Accelerates student detail attendance tab & report card export.
--    - ph_schedules (class_id, semester_id, date ASC) WHERE deleted_at IS NULL
--      Enables pre-sorted index scans for weekly ASH schedule views.
--    - bintang_monthly_evaluations (student_id, month DESC) WHERE is_published = true
--      Optimizes parent portal and student published evaluations filter.
--    - academic_records (semester_id, student_id) WHERE deleted_at IS NULL
--      Optimizes class-level mass input and academic records fetch.
--
-- 2. RLS InitPlan Optimization:
--    - Wraps auth.uid() in (SELECT auth.uid()) on ph_schedules policies
--      Prevents Postgres query planner from re-evaluating auth function per-row.
--
-- 3. Function Security:
--    - Pins search_path on update_bintang_updated_at_column().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. High-Impact Performance Indexes
-- -----------------------------------------------------------------------------

-- Attendance: Global analytics dashboard filters by date and status
CREATE INDEX IF NOT EXISTS idx_attendance_date_status
    ON public.attendance (date, status)
    WHERE deleted_at IS NULL;

-- Attendance: Student detail and ledger export queries by student + semester
CREATE INDEX IF NOT EXISTS idx_attendance_student_semester
    ON public.attendance (student_id, semester_id)
    WHERE deleted_at IS NULL;

-- PH Schedules: Weekly and list views filter by class + semester and sort by date ASC
CREATE INDEX IF NOT EXISTS idx_ph_schedules_class_semester_date
    ON public.ph_schedules (class_id, semester_id, date ASC)
    WHERE deleted_at IS NULL;

-- Bintang Evaluations: Parent portal & student published evaluation lookups
CREATE INDEX IF NOT EXISTS idx_bintang_monthly_eval_published
    ON public.bintang_monthly_evaluations (student_id, month DESC)
    WHERE is_published = true;

-- Academic Records: Class grade grids and mass input fetch by semester + student list
CREATE INDEX IF NOT EXISTS idx_academic_records_semester_student
    ON public.academic_records (semester_id, student_id)
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Function Security Hardening
-- -----------------------------------------------------------------------------

-- Pin search_path on recent trigger function to prevent search_path manipulation
ALTER FUNCTION public.update_bintang_updated_at_column()
    SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 3. RLS InitPlan Optimization on ph_schedules
-- -----------------------------------------------------------------------------

-- Re-create ph_schedules policies using (SELECT auth.uid()) for scalar InitPlan execution
DO $$
DECLARE
    p record;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ph_schedules'
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
    LOOP
        EXECUTE format('DROP POLICY %I ON public.ph_schedules', p.policyname);
    END LOOP;
END $$;

CREATE POLICY "Teachers can add PH"
    ON public.ph_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT auth.uid())
        AND public.can_add_ph_schedule(class_id, semester_id)
    );

CREATE POLICY "PH creator or homeroom can update"
    ON public.ph_schedules
    FOR UPDATE
    TO authenticated
    USING (
        public.can_manage_ph_schedule(class_id, semester_id)
        OR (created_by = (SELECT auth.uid()) AND public.can_add_ph_schedule(class_id, semester_id))
    )
    WITH CHECK (
        public.can_manage_ph_schedule(class_id, semester_id)
        OR (created_by = (SELECT auth.uid()) AND public.can_add_ph_schedule(class_id, semester_id))
    );

CREATE POLICY "PH creator or homeroom can delete"
    ON public.ph_schedules
    FOR DELETE
    TO authenticated
    USING (
        public.can_manage_ph_schedule(class_id, semester_id)
        OR (created_by = (SELECT auth.uid()) AND public.can_add_ph_schedule(class_id, semester_id))
    );

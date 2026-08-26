-- =============================================================================
-- Migration: Add Performance Indexes for BINTANG, Journals, and Attitude
-- Created: 2026-08-26
-- Description: Composite and reverse-lookup indexes to optimize queries on:
--              1. bintang_mentoring_logs (student_id, date)
--              2. bintang_daily_observations (student_id, date)
--              3. bintang_monthly_evaluations (student_id, month)
--              4. teaching_journals (schedule_id, class_id)
--              5. attitude_records (student_id, semester_id, deleted_at)
-- =============================================================================

-- 1. BINTANG Mentoring Logs Indexes
CREATE INDEX IF NOT EXISTS idx_bintang_mentoring_student_date
    ON public.bintang_mentoring_logs(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_bintang_mentoring_mentor_date
    ON public.bintang_mentoring_logs(mentor_id, date DESC);

-- 2. BINTANG Daily Observations Indexes
CREATE INDEX IF NOT EXISTS idx_bintang_observations_student_date
    ON public.bintang_daily_observations(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_bintang_observations_teacher_date
    ON public.bintang_daily_observations(teacher_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_bintang_observations_aspect
    ON public.bintang_daily_observations(student_id, aspect);

-- 3. BINTANG Monthly Evaluations Indexes
CREATE INDEX IF NOT EXISTS idx_bintang_monthly_eval_student_month
    ON public.bintang_monthly_evaluations(student_id, month DESC);

-- 4. Teaching Journals Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_teaching_journals_schedule_id
    ON public.teaching_journals(schedule_id);

CREATE INDEX IF NOT EXISTS idx_teaching_journals_class_id
    ON public.teaching_journals(class_id);

-- 5. Attitude Records Indexes
CREATE INDEX IF NOT EXISTS idx_attitude_records_student_semester
    ON public.attitude_records(student_id, semester_id)
    WHERE deleted_at IS NULL;

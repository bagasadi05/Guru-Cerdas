-- Migration: Add unique constraint and performance index on academic_records
-- Purpose: Prevent duplicate grade records for the same student, subject, assessment_name, and semester.

-- 1. Deduplicate existing active records (soft-delete older duplicates by keeping latest updated/created)
WITH ranked_active AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY student_id,
                            subject,
                            COALESCE(assessment_name, ''),
                            COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
               ORDER BY created_at DESC, COALESCE(version, 0) DESC, id DESC
           ) AS rn
    FROM public.academic_records
    WHERE deleted_at IS NULL
)
UPDATE public.academic_records ar
SET deleted_at = now()
FROM ranked_active r
WHERE ar.id = r.id AND r.rn > 1;

-- 2. Clean up any historical duplicate records among soft-deleted rows to ensure table-wide unique constraint integrity
WITH ranked_all AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY student_id,
                            subject,
                            COALESCE(assessment_name, ''),
                            COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
               ORDER BY (deleted_at IS NULL) DESC, created_at DESC, id DESC
           ) AS rn
    FROM public.academic_records
)
DELETE FROM public.academic_records
WHERE id IN (SELECT id FROM ranked_all WHERE rn > 1);

-- 3. Add UNIQUE constraint with NULLS NOT DISTINCT (PG 15+) or standard UNIQUE fallback
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_academic_records_student_subject_assessment_semester'
    ) THEN
        BEGIN
            ALTER TABLE public.academic_records
            ADD CONSTRAINT uq_academic_records_student_subject_assessment_semester
            UNIQUE NULLS NOT DISTINCT (student_id, subject, assessment_name, semester_id);
        EXCEPTION WHEN syntax_error OR feature_not_supported THEN
            ALTER TABLE public.academic_records
            ADD CONSTRAINT uq_academic_records_student_subject_assessment_semester
            UNIQUE (student_id, subject, assessment_name, semester_id);
        END;
    END IF;
END $$;

-- 4. Create performance indexes for lookups by student, subject, and semester
CREATE INDEX IF NOT EXISTS idx_academic_records_student_semester
ON public.academic_records (student_id, semester_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_academic_records_subject_semester
ON public.academic_records (subject, semester_id)
WHERE deleted_at IS NULL;

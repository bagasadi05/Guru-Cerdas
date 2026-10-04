-- One live grade per student, subject, assessment and semester.
--
-- Mass input shares a single record between teachers for the same assessment
-- (it looks the row up without user_id), and the app's dedupe key
-- (buildAcademicRecordIdentityKey) normalises subject and assessment name by
-- trim + lower case. Without a database constraint, two devices saving the
-- first grade for a student at the same moment both pass the client lookup and
-- create two rows. The index turns that race into a 23505 error the client can
-- report as a conflict.

DO $$
DECLARE
    duplicate_groups INTEGER;
BEGIN
    SELECT count(*) INTO duplicate_groups
    FROM (
        SELECT 1
        FROM academic_records
        WHERE deleted_at IS NULL
        GROUP BY student_id, lower(btrim(subject)), lower(btrim(assessment_name)), semester_id
        HAVING count(*) > 1
    ) d;

    IF duplicate_groups > 0 THEN
        RAISE EXCEPTION 'academic_records has % duplicate live grade groups; resolve them before adding the unique index', duplicate_groups;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_records_live_assessment
    ON public.academic_records (student_id, lower(btrim(subject)), lower(btrim(assessment_name)), semester_id)
    WHERE deleted_at IS NULL;

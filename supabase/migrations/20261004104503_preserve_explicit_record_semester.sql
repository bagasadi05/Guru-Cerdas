-- Keep the semester the client sends instead of re-deriving it from the
-- insert time.
--
-- The previous trigger functions always overwrote NEW.semester_id with the
-- semester containing NEW.created_at (or the active one). Because PostgREST
-- upserts fire BEFORE INSERT too, this meant:
--   * grades entered for an earlier semester were saved into the current one;
--   * editing an existing grade through the mass-input upsert moved it to the
--     current semester;
--   * back-dated quiz/attitude points were filed by insert time, not quiz_date.
--
-- Rows that arrive without a (live) semester still get one derived the same
-- way as before: from quiz_date for points, from created_at for grades, then
-- the active semester as a last resort.

CREATE OR REPLACE FUNCTION public.set_academic_record_semester_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
    matching_semester_id UUID;
    record_day DATE := (COALESCE(NEW.created_at, now()) AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
    IF NEW.semester_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM semesters WHERE id = NEW.semester_id AND deleted_at IS NULL
    ) THEN
        RETURN NEW;
    END IF;

    SELECT id INTO matching_semester_id
    FROM semesters
    WHERE deleted_at IS NULL AND record_day BETWEEN start_date AND end_date
    ORDER BY start_date DESC
    LIMIT 1;

    IF matching_semester_id IS NULL THEN
        SELECT id INTO matching_semester_id
        FROM semesters
        WHERE deleted_at IS NULL AND is_active = true
        LIMIT 1;
    END IF;

    IF matching_semester_id IS NOT NULL THEN
        NEW.semester_id := matching_semester_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_quiz_point_semester_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
    matching_semester_id UUID;
    point_day DATE := COALESCE(
        NEW.quiz_date::date,
        (COALESCE(NEW.created_at, now()) AT TIME ZONE 'Asia/Jakarta')::date
    );
BEGIN
    IF NEW.semester_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM semesters WHERE id = NEW.semester_id AND deleted_at IS NULL
    ) THEN
        RETURN NEW;
    END IF;

    SELECT id INTO matching_semester_id
    FROM semesters
    WHERE deleted_at IS NULL AND point_day BETWEEN start_date AND end_date
    ORDER BY start_date DESC
    LIMIT 1;

    IF matching_semester_id IS NULL THEN
        SELECT id INTO matching_semester_id
        FROM semesters
        WHERE deleted_at IS NULL AND is_active = true
        LIMIT 1;
    END IF;

    IF matching_semester_id IS NOT NULL THEN
        NEW.semester_id := matching_semester_id;
    END IF;

    RETURN NEW;
END;
$function$;

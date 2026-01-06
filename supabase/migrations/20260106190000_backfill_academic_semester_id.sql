-- Migration to backfill semester_id for academic_records based on creation date
-- This ensures that historical grades show up correctly when filtered by semester in reports

DO $$
DECLARE
    sem RECORD;
BEGIN
    -- Loop through all semesters
    FOR sem IN SELECT id, start_date, end_date FROM semesters ORDER BY start_date DESC LOOP
        -- Update academic_records that fall within this semester's date range
        -- and currently have no semester_id or were assigned to the default active semester incorrectly
        UPDATE academic_records
        SET semester_id = sem.id
        WHERE 
            (semester_id IS NULL)
            AND created_at >= sem.start_date
            AND created_at <= (sem.end_date::date + 1); -- Add 1 day to cover the full end date
            
        RAISE NOTICE 'Updated academic_records for semester % (Range: % to %)', sem.id, sem.start_date, sem.end_date;
    END LOOP;

    -- Also adding a trigger to ensure future inserts automatically get the correct semester_id
    -- similar to the attendance trigger
    
    CREATE OR REPLACE FUNCTION set_academic_record_semester_id()
    RETURNS TRIGGER AS $$
    DECLARE
        matching_semester_id UUID;
    BEGIN
        -- Try to find a matching semester based on created_at
        SELECT id INTO matching_semester_id
        FROM semesters
        WHERE NEW.created_at >= start_date AND NEW.created_at <= (end_date::date + 1)
        ORDER BY start_date DESC
        LIMIT 1;

        -- If found, set it
        IF matching_semester_id IS NOT NULL THEN
            NEW.semester_id := matching_semester_id;
        ELSE
            -- Fallback to active semester if no date match
            SELECT id INTO matching_semester_id
            FROM semesters
            WHERE is_active = true
            LIMIT 1;
            
            IF matching_semester_id IS NOT NULL THEN
                NEW.semester_id := matching_semester_id;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS ensure_academic_record_semester ON academic_records;

    CREATE TRIGGER ensure_academic_record_semester
    BEFORE INSERT ON academic_records
    FOR EACH ROW
    EXECUTE FUNCTION set_academic_record_semester_id();

END $$;

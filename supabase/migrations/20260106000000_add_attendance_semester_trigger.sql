-- Migration: Add trigger to auto-populate semester_id on attendance records
-- Created: 2026-01-06

-- Function to get semester_id based on a date
CREATE OR REPLACE FUNCTION get_semester_id_for_date(check_date DATE)
RETURNS UUID AS $$
DECLARE
    found_semester_id UUID;
BEGIN
    -- First, try to find a semester where the date falls within its range
    SELECT id INTO found_semester_id
    FROM semesters
    WHERE check_date >= start_date AND check_date <= end_date
    LIMIT 1;
    
    -- If no matching semester found, get the active semester
    IF found_semester_id IS NULL THEN
        SELECT id INTO found_semester_id
        FROM semesters
        WHERE is_active = true
        LIMIT 1;
    END IF;
    
    RETURN found_semester_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-populate semester_id before insert
CREATE OR REPLACE FUNCTION set_attendance_semester_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set semester_id if it's not already provided
    IF NEW.semester_id IS NULL THEN
        NEW.semester_id := get_semester_id_for_date(NEW.date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_set_attendance_semester_id ON attendance;

-- Create the trigger
CREATE TRIGGER trigger_set_attendance_semester_id
    BEFORE INSERT ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION set_attendance_semester_id();

-- Also update existing attendance records that don't have semester_id
UPDATE attendance
SET semester_id = get_semester_id_for_date(date)
WHERE semester_id IS NULL;

-- Add comment for documentation
COMMENT ON FUNCTION get_semester_id_for_date(DATE) IS 'Returns the semester ID for a given date, falling back to active semester if no match found';
COMMENT ON FUNCTION set_attendance_semester_id() IS 'Trigger function to auto-populate semester_id on attendance records';

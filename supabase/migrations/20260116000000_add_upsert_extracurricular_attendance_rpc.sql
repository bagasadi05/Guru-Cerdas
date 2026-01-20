-- Migration: Add RPC for upserting extracurricular attendance
-- Created: 2026-01-16
-- Description: Function to safely upsert attendance records with partial indices

CREATE OR REPLACE FUNCTION upsert_extracurricular_attendance(
  p_items jsonb,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  -- Verify user exists (optional, referential integrity handles it usually but we need to trust p_user_id)
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Iterate through items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (item->>'student_id') IS NOT NULL THEN
      INSERT INTO extracurricular_attendance (
        student_id, extracurricular_id, semester_id, date, status, notes, user_id
      ) VALUES (
        (item->>'student_id')::uuid,
        (item->>'extracurricular_id')::uuid,
        (item->>'semester_id')::uuid,
        (item->>'date')::date,
        (item->>'status')::varchar,
        (item->>'notes'), -- Can be null
        auth.uid()
      )
      ON CONFLICT (student_id, extracurricular_id, date) WHERE student_id IS NOT NULL
      DO UPDATE SET
        status = COALESCE(EXCLUDED.status, extracurricular_attendance.status),
        notes = COALESCE(EXCLUDED.notes, extracurricular_attendance.notes);
    ELSIF (item->>'extracurricular_student_id') IS NOT NULL THEN
      INSERT INTO extracurricular_attendance (
        extracurricular_student_id, extracurricular_id, semester_id, date, status, notes, user_id
      ) VALUES (
        (item->>'extracurricular_student_id')::uuid,
        (item->>'extracurricular_id')::uuid,
        (item->>'semester_id')::uuid,
        (item->>'date')::date,
        (item->>'status')::varchar,
        (item->>'notes'), -- Can be null
        auth.uid()
      )
      ON CONFLICT (extracurricular_student_id, extracurricular_id, date) WHERE extracurricular_student_id IS NOT NULL
      DO UPDATE SET
        status = COALESCE(EXCLUDED.status, extracurricular_attendance.status),
        notes = COALESCE(EXCLUDED.notes, extracurricular_attendance.notes);
    END IF;
  END LOOP;
END;
$$;

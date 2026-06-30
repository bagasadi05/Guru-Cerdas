-- Archive old attendance records to a separate table to free up main table space.
-- Run AFTER a semesters update (end of semester).

CREATE TABLE IF NOT EXISTS attendance_archive (
  LIKE attendance INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  original_semester_id UUID
);

CREATE INDEX IF NOT EXISTS idx_attendance_archive_semester ON attendance_archive(original_semester_id);
CREATE INDEX IF NOT EXISTS idx_attendance_archive_date ON attendance_archive(date);

-- Move previous semester data (semesters whose end_date is before the current active semester start)
INSERT INTO attendance_archive (
  id, student_id, user_id, date, status, notes, semester_id, created_at, deleted_at,
  original_semester_id
)
SELECT id, student_id, user_id, date, status, notes, semester_id, created_at, deleted_at,
       semester_id
FROM attendance a
WHERE a.semester_id IN (
  SELECT id FROM semesters WHERE end_date < (SELECT start_date FROM semesters WHERE is_active = true LIMIT 1)
)
AND a.deleted_at IS NULL;

-- Remove archived rows from main table
DELETE FROM attendance
WHERE semester_id IN (
  SELECT id FROM semesters WHERE end_date < (SELECT start_date FROM semesters WHERE is_active = true LIMIT 1)
);

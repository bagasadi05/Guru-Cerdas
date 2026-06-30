-- Compress old violation records by nullifying blob data while preserving points.
-- Run AFTER end of semester.

UPDATE violations
SET
  evidence_url = NULL
WHERE semester_id IN (
  SELECT id FROM semesters WHERE end_date < (SELECT start_date FROM semesters WHERE is_active = true LIMIT 1)
)
AND evidence_url IS NOT NULL;

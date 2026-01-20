-- ============================================
-- Migration: Migrate Extracurricular-Only Students
-- Created: 2026-01-15
-- Description: Move students who only exist in extracurricular features
--              into extracurricular_students and update references.
-- ============================================

WITH candidate_students AS (
  SELECT s.id, s.name, s.gender, s.class_id, s.user_id
  FROM students s
  WHERE EXISTS (SELECT 1 FROM student_extracurriculars se WHERE se.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM academic_records ar WHERE ar.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM violations v WHERE v.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM quiz_points q WHERE q.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.student_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM communications c WHERE c.student_id = s.id)
),
inserted AS (
  INSERT INTO extracurricular_students (id, name, gender, class_name, user_id)
  SELECT cs.id, cs.name, cs.gender, cl.name, cs.user_id
  FROM candidate_students cs
  LEFT JOIN classes cl ON cl.id = cs.class_id
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
UPDATE student_extracurriculars se
SET extracurricular_student_id = se.student_id,
    student_id = NULL
WHERE se.student_id IN (SELECT id FROM candidate_students);

UPDATE extracurricular_attendance ea
SET extracurricular_student_id = ea.student_id,
    student_id = NULL
WHERE ea.student_id IN (SELECT id FROM candidate_students);

UPDATE extracurricular_grades eg
SET extracurricular_student_id = eg.student_id,
    student_id = NULL
WHERE eg.student_id IN (SELECT id FROM candidate_students);

DELETE FROM students
WHERE id IN (SELECT id FROM candidate_students);

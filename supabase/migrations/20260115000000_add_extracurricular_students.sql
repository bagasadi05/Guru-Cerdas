-- ============================================
-- Migration: Add Extracurricular Students
-- Created: 2026-01-15
-- Description: Allow extracurricular-only students without adding to main students table
-- ============================================

-- 1. Table for extracurricular-only students
CREATE TABLE IF NOT EXISTS extracurricular_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  gender gender_enum,
  class_name VARCHAR(50),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracurricular_students_user_id ON extracurricular_students(user_id);

-- 2. Add optional reference to extracurricular_students in related tables
ALTER TABLE student_extracurriculars
  ADD COLUMN IF NOT EXISTS extracurricular_student_id UUID REFERENCES extracurricular_students(id) ON DELETE CASCADE;

ALTER TABLE extracurricular_attendance
  ADD COLUMN IF NOT EXISTS extracurricular_student_id UUID REFERENCES extracurricular_students(id) ON DELETE CASCADE;

ALTER TABLE extracurricular_grades
  ADD COLUMN IF NOT EXISTS extracurricular_student_id UUID REFERENCES extracurricular_students(id) ON DELETE CASCADE;

-- 3. Allow nullable student_id to support extracurricular-only participants
ALTER TABLE student_extracurriculars
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE extracurricular_attendance
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE extracurricular_grades
  ALTER COLUMN student_id DROP NOT NULL;

-- 4. Drop old unique constraints (if any) and replace with partial unique indexes
ALTER TABLE student_extracurriculars
  DROP CONSTRAINT IF EXISTS student_extracurriculars_student_id_extracurricular_id_semester_id_key;

ALTER TABLE extracurricular_attendance
  DROP CONSTRAINT IF EXISTS extracurricular_attendance_student_id_extracurricular_id_date_key;

ALTER TABLE extracurricular_grades
  DROP CONSTRAINT IF EXISTS extracurricular_grades_student_id_extracurricular_id_semester_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_extracurriculars_student_unique
  ON student_extracurriculars (student_id, extracurricular_id, semester_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_extracurriculars_extracurricular_student_unique
  ON student_extracurriculars (extracurricular_student_id, extracurricular_id, semester_id)
  WHERE extracurricular_student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extracurricular_attendance_student_unique
  ON extracurricular_attendance (student_id, extracurricular_id, date)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extracurricular_attendance_extracurricular_student_unique
  ON extracurricular_attendance (extracurricular_student_id, extracurricular_id, date)
  WHERE extracurricular_student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extracurricular_grades_student_unique
  ON extracurricular_grades (student_id, extracurricular_id, semester_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extracurricular_grades_extracurricular_student_unique
  ON extracurricular_grades (extracurricular_student_id, extracurricular_id, semester_id)
  WHERE extracurricular_student_id IS NOT NULL;

-- 5. Ensure only one of student_id or extracurricular_student_id is set
ALTER TABLE student_extracurriculars
  ADD CONSTRAINT student_extracurriculars_participant_xor
  CHECK (
    (student_id IS NOT NULL AND extracurricular_student_id IS NULL) OR
    (student_id IS NULL AND extracurricular_student_id IS NOT NULL)
  );

ALTER TABLE extracurricular_attendance
  ADD CONSTRAINT extracurricular_attendance_participant_xor
  CHECK (
    (student_id IS NOT NULL AND extracurricular_student_id IS NULL) OR
    (student_id IS NULL AND extracurricular_student_id IS NOT NULL)
  );

ALTER TABLE extracurricular_grades
  ADD CONSTRAINT extracurricular_grades_participant_xor
  CHECK (
    (student_id IS NOT NULL AND extracurricular_student_id IS NULL) OR
    (student_id IS NULL AND extracurricular_student_id IS NOT NULL)
  );

-- 6. RLS for extracurricular_students
ALTER TABLE extracurricular_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extracurricular_students"
  ON extracurricular_students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracurricular_students"
  ON extracurricular_students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracurricular_students"
  ON extracurricular_students FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracurricular_students"
  ON extracurricular_students FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Migration: Create Extracurricular Tables
-- Created: 2026-01-09
-- Description: Tables for managing extracurricular activities,
--              student enrollment, attendance, and grades
-- ============================================

-- 1. Master data ekstrakurikuler
CREATE TABLE IF NOT EXISTS extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  schedule_day VARCHAR(20),
  schedule_time VARCHAR(50),
  coach_name VARCHAR(100),
  max_participants INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pendaftaran siswa ke ekstrakurikuler
CREATE TABLE IF NOT EXISTS student_extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  extracurricular_id UUID REFERENCES extracurriculars(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id),
  joined_at DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, extracurricular_id, semester_id)
);

-- 3. Presensi ekstrakurikuler
CREATE TABLE IF NOT EXISTS extracurricular_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  extracurricular_id UUID REFERENCES extracurriculars(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, extracurricular_id, date)
);

-- 4. Nilai/penilaian ekstrakurikuler
CREATE TABLE IF NOT EXISTS extracurricular_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  extracurricular_id UUID REFERENCES extracurriculars(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id),
  grade VARCHAR(5),
  score DECIMAL(5,2),
  description TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, extracurricular_id, semester_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_extracurriculars_user_id ON extracurriculars(user_id);
CREATE INDEX IF NOT EXISTS idx_extracurriculars_is_active ON extracurriculars(is_active);

CREATE INDEX IF NOT EXISTS idx_student_extracurriculars_student_id ON student_extracurriculars(student_id);
CREATE INDEX IF NOT EXISTS idx_student_extracurriculars_extracurricular_id ON student_extracurriculars(extracurricular_id);
CREATE INDEX IF NOT EXISTS idx_student_extracurriculars_semester_id ON student_extracurriculars(semester_id);

CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_student_id ON extracurricular_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_extracurricular_id ON extracurricular_attendance(extracurricular_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_date ON extracurricular_attendance(date);

CREATE INDEX IF NOT EXISTS idx_extracurricular_grades_student_id ON extracurricular_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_grades_extracurricular_id ON extracurricular_grades(extracurricular_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_grades_semester_id ON extracurricular_grades(semester_id);

-- Enable Row Level Security
ALTER TABLE extracurriculars ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_extracurriculars ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for extracurriculars
CREATE POLICY "Users can view their own extracurriculars"
  ON extracurriculars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracurriculars"
  ON extracurriculars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracurriculars"
  ON extracurriculars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracurriculars"
  ON extracurriculars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for student_extracurriculars
CREATE POLICY "Users can view their own student_extracurriculars"
  ON student_extracurriculars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own student_extracurriculars"
  ON student_extracurriculars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own student_extracurriculars"
  ON student_extracurriculars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own student_extracurriculars"
  ON student_extracurriculars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for extracurricular_attendance
CREATE POLICY "Users can view their own extracurricular_attendance"
  ON extracurricular_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracurricular_attendance"
  ON extracurricular_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracurricular_attendance"
  ON extracurricular_attendance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracurricular_attendance"
  ON extracurricular_attendance FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for extracurricular_grades
CREATE POLICY "Users can view their own extracurricular_grades"
  ON extracurricular_grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracurricular_grades"
  ON extracurricular_grades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracurricular_grades"
  ON extracurricular_grades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracurricular_grades"
  ON extracurricular_grades FOR DELETE
  USING (auth.uid() = user_id);

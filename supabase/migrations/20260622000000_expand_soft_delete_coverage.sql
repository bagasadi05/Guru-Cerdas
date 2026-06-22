-- ============================================
-- Migration: Expand Soft Delete Coverage
-- Created: 2026-06-22
-- Description: Add deleted_at to tables that don't have it yet,
--              plus indexes and documentation.
-- ============================================

-- 1. Add deleted_at columns to tables that need soft delete support
ALTER TABLE reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE extracurriculars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE student_extracurriculars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE extracurricular_attendance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE extracurricular_grades ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE extracurricular_students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE student_achievements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE student_development_analyses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE school_info ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes on deleted_at columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_reports_deleted_at ON reports(deleted_at);
CREATE INDEX IF NOT EXISTS idx_schedules_deleted_at ON schedules(deleted_at);
CREATE INDEX IF NOT EXISTS idx_communications_deleted_at ON communications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_homework_deleted_at ON homework(deleted_at);
CREATE INDEX IF NOT EXISTS idx_extracurriculars_deleted_at ON extracurriculars(deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_extracurriculars_deleted_at ON student_extracurriculars(deleted_at);
CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_deleted_at ON extracurricular_attendance(deleted_at);
CREATE INDEX IF NOT EXISTS idx_extracurricular_grades_deleted_at ON extracurricular_grades(deleted_at);
CREATE INDEX IF NOT EXISTS idx_extracurricular_students_deleted_at ON extracurricular_students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_achievements_deleted_at ON student_achievements(deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_development_analyses_deleted_at ON student_development_analyses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_school_info_deleted_at ON school_info(deleted_at);
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements(deleted_at);
CREATE INDEX IF NOT EXISTS idx_academic_years_deleted_at ON academic_years(deleted_at);
CREATE INDEX IF NOT EXISTS idx_semesters_deleted_at ON semesters(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_deleted_at ON user_settings(deleted_at);

-- 3. Add comments for documentation
COMMENT ON COLUMN reports.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN schedules.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN communications.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN homework.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN extracurriculars.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN student_extracurriculars.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN extracurricular_attendance.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN extracurricular_grades.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN extracurricular_students.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN student_achievements.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN student_development_analyses.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN school_info.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN announcements.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN academic_years.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN semesters.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN user_settings.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';

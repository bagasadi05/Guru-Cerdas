-- ============================================
-- Migration: Deletion Audit Table & Triggers
-- Created: 2026-06-22
-- Description: Creates deletion_audit table with
--              automatic triggers on all soft-delete
--              enabled tables to capture row snapshots
--              before deletion/restoration.
-- ============================================

-- 1. Create deletion_audit table
CREATE TABLE IF NOT EXISTS deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    restored_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    row_snapshot JSONB,
    deletion_type TEXT NOT NULL DEFAULT 'soft' CHECK (deletion_type IN ('soft', 'hard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deletion_audit_table_name ON deletion_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_record_id ON deletion_audit(record_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON deletion_audit(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_restored_at ON deletion_audit(restored_at);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_by ON deletion_audit(deleted_by);

-- 3. Enable RLS
ALTER TABLE deletion_audit ENABLE ROW LEVEL SECURITY;

-- 4. RLS: users can see only their own deletion audit records
CREATE POLICY "Users can view their own deletion audit"
    ON deletion_audit
    FOR SELECT
    USING (deleted_by = auth.uid());

-- 5. RLS: allow trigger inserts (trigger runs as security definer)
CREATE POLICY "Allow trigger inserts"
    ON deletion_audit
    FOR INSERT
    WITH CHECK (true);

-- 6. Comment
COMMENT ON TABLE deletion_audit IS 'Menyimpan snapshot data yang dihapus untuk pemulihan';

-- 7. Trigger function: captures soft deletes and restores
CREATE OR REPLACE FUNCTION capture_soft_delete()
RETURNS TRIGGER AS $$
DECLARE
    _record_id TEXT;
BEGIN
    -- Determine primary key dynamically
    -- Most tables have 'id' as PK; user_settings uses 'user_id'
    IF TG_TABLE_NAME = 'user_settings' THEN
        _record_id := OLD.user_id::text;
    ELSE
        _record_id := OLD.id::text;
    END IF;

    -- Soft delete: deleted_at changed from NULL to non-NULL
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO deletion_audit (table_name, record_id, deleted_by, row_snapshot)
        VALUES (TG_TABLE_NAME, _record_id, auth.uid(), row_to_json(OLD)::jsonb);
    END IF;

    -- Restore: deleted_at changed from non-NULL to NULL
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE deletion_audit
        SET restored_at = now()
        WHERE table_name = TG_TABLE_NAME
          AND record_id = _record_id
          AND restored_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers on all tables with deleted_at column
-- Original soft-delete tables
CREATE TRIGGER trg_soft_delete_students
    BEFORE UPDATE OF deleted_at ON students
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_classes
    BEFORE UPDATE OF deleted_at ON classes
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_attendance
    BEFORE UPDATE OF deleted_at ON attendance
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_tasks
    BEFORE UPDATE OF deleted_at ON tasks
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_violations
    BEFORE UPDATE OF deleted_at ON violations
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_quiz_points
    BEFORE UPDATE OF deleted_at ON quiz_points
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_academic_records
    BEFORE UPDATE OF deleted_at ON academic_records
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_teacher_class_assignments
    BEFORE UPDATE OF deleted_at ON teacher_class_assignments
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_user_roles
    BEFORE UPDATE OF deleted_at ON user_roles
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

-- New soft-delete tables
CREATE TRIGGER trg_soft_delete_reports
    BEFORE UPDATE OF deleted_at ON reports
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_schedules
    BEFORE UPDATE OF deleted_at ON schedules
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_communications
    BEFORE UPDATE OF deleted_at ON communications
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_homework
    BEFORE UPDATE OF deleted_at ON homework
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_extracurriculars
    BEFORE UPDATE OF deleted_at ON extracurriculars
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_student_extracurriculars
    BEFORE UPDATE OF deleted_at ON student_extracurriculars
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_extracurricular_attendance
    BEFORE UPDATE OF deleted_at ON extracurricular_attendance
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_extracurricular_grades
    BEFORE UPDATE OF deleted_at ON extracurricular_grades
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_extracurricular_students
    BEFORE UPDATE OF deleted_at ON extracurricular_students
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_student_achievements
    BEFORE UPDATE OF deleted_at ON student_achievements
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_student_development_analyses
    BEFORE UPDATE OF deleted_at ON student_development_analyses
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_school_info
    BEFORE UPDATE OF deleted_at ON school_info
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_announcements
    BEFORE UPDATE OF deleted_at ON announcements
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_academic_years
    BEFORE UPDATE OF deleted_at ON academic_years
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_semesters
    BEFORE UPDATE OF deleted_at ON semesters
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

CREATE TRIGGER trg_soft_delete_user_settings
    BEFORE UPDATE OF deleted_at ON user_settings
    FOR EACH ROW WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION capture_soft_delete();

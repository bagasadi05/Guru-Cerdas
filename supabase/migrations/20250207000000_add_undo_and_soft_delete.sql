-- Migration: Add undo functionality and soft delete support
-- Date: 2025-02-07
-- Description: Adds deleted_at columns to main tables, creates action_history and export_templates tables

-- Add deleted_at columns to existing tables for soft delete functionality
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create indexes on deleted_at columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON classes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_attendance_deleted_at ON attendance(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Create action_history table to track undoable actions
CREATE TABLE IF NOT EXISTS action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  affected_ids TEXT[] NOT NULL,
  previous_state JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  can_undo BOOLEAN DEFAULT TRUE
);

-- Create indexes for action_history table
CREATE INDEX IF NOT EXISTS idx_action_history_user_expires ON action_history(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON action_history(created_at);
CREATE INDEX IF NOT EXISTS idx_action_history_can_undo ON action_history(can_undo) WHERE can_undo = TRUE;

-- Create export_templates table to store user export configurations
CREATE TABLE IF NOT EXISTS export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for export_templates table
CREATE INDEX IF NOT EXISTS idx_export_templates_user ON export_templates(user_id);

-- Add comment to tables for documentation
COMMENT ON TABLE action_history IS 'Stores history of user actions that can be undone';
COMMENT ON TABLE export_templates IS 'Stores user-defined export configuration templates';
COMMENT ON COLUMN students.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN classes.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN attendance.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';
COMMENT ON COLUMN tasks.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';

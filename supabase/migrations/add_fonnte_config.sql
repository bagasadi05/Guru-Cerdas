-- Migration: Add fonnte_config column to user_settings table
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/<project-id>/sql/new

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS fonnte_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.fonnte_config IS 'WhatsApp notification configuration for Fonnte integration';

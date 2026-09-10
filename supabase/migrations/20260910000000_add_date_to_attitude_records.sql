-- Migration: Add date column to public.attitude_records
-- Supports recording the specific observation/input date for attitude assessments
-- Timestamp: 20260910000000

ALTER TABLE public.attitude_records
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_attitude_records_date ON public.attitude_records(date) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.attitude_records.date IS 'Tanggal penilaian atau observasi sikap siswa';

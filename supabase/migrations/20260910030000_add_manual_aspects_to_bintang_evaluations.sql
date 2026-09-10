-- Migration: Add manual_aspects column to bintang_monthly_evaluations
-- Allows tracking which aspect grades (ADAB, KEDISIPLINAN, KERAPIAN, etc.)
-- were manually adjusted by teachers so that bulk "Generate" does not overwrite them.

ALTER TABLE public.bintang_monthly_evaluations
ADD COLUMN IF NOT EXISTS manual_aspects text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.bintang_monthly_evaluations.manual_aspects IS
'Daftar aspek yang disesuaikan manual oleh guru (e.g. ADAB, KEDISIPLINAN, KERAPIAN, CATATAN_WALI) agar tidak ditimpa oleh generate otomatis.';

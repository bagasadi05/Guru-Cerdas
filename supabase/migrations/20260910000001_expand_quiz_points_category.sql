-- Migration: Relax quiz_points_category_check constraint to allow attitude aspects & flexible activities
-- Background: quiz_points is used for positive character & active points in Rapot BINTANG
-- Original constraint restricted category to ARRAY['bertanya', 'presentasi', 'tugas_tambahan', 'menjawab', 'diskusi', 'lainnya']
-- which caused 400 Bad Request when inserting BINTANG attitude aspects (e.g. 'Adab & Akhlak').

ALTER TABLE public.quiz_points
DROP CONSTRAINT IF EXISTS quiz_points_category_check;

ALTER TABLE public.quiz_points
ADD CONSTRAINT quiz_points_category_check
CHECK (category IS NULL OR length(trim(category)) > 0);

COMMENT ON CONSTRAINT quiz_points_category_check ON public.quiz_points IS 'Permits valid activity categories including BINTANG attitude aspects';

-- Add is_archived to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_classes_is_archived ON public.classes(is_archived);

-- Perangkat Ajar: school-wide Kaldik and teacher-set Promes cells.
--
-- 1. school_kaldik_entries: one Kaldik per academic year for the whole school.
--    Every signed-in user can read it; only admins (public.is_admin_user) can write it.
-- 2. promes_week_allocations.is_manual: marks cells the teacher set by hand so that
--    "Bagi ulang" keeps them. The app falls back to saving without it until this runs.

CREATE TABLE IF NOT EXISTS public.school_kaldik_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  week_type TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_school_kaldik_week UNIQUE (academic_year, month, week_number)
);

CREATE INDEX IF NOT EXISTS idx_school_kaldik_year ON public.school_kaldik_entries(academic_year);
CREATE INDEX IF NOT EXISTS idx_school_kaldik_updated_by ON public.school_kaldik_entries(updated_by);

ALTER TABLE public.school_kaldik_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_kaldik_read ON public.school_kaldik_entries;
CREATE POLICY school_kaldik_read ON public.school_kaldik_entries
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS school_kaldik_admin_insert ON public.school_kaldik_entries;
CREATE POLICY school_kaldik_admin_insert ON public.school_kaldik_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS school_kaldik_admin_update ON public.school_kaldik_entries;
CREATE POLICY school_kaldik_admin_update ON public.school_kaldik_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin_user((SELECT auth.uid())))
  WITH CHECK (public.is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS school_kaldik_admin_delete ON public.school_kaldik_entries;
CREATE POLICY school_kaldik_admin_delete ON public.school_kaldik_entries
  FOR DELETE TO authenticated
  USING (public.is_admin_user((SELECT auth.uid())));

ALTER TABLE public.promes_week_allocations
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;

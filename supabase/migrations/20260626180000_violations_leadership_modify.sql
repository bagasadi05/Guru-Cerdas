-- Allow school leadership (kepala_madrasah / waka_kesiswaan / admin) to modify
-- and delete violation records. Soft-delete is an UPDATE of deleted_at, so both
-- UPDATE and DELETE policies are required. Idempotent (DROP IF EXISTS first).
-- Uses existing helper public.is_leadership(uuid).

DROP POLICY IF EXISTS "Violations: leadership can update" ON public.violations;
CREATE POLICY "Violations: leadership can update"
  ON public.violations
  FOR UPDATE
  USING (public.is_leadership(auth.uid()))
  WITH CHECK (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "Violations: leadership can delete" ON public.violations;
CREATE POLICY "Violations: leadership can delete"
  ON public.violations
  FOR DELETE
  USING (public.is_leadership(auth.uid()));

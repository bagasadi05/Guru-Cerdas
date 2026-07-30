-- Migration: 20260802000000_fix_rls_ai_generation_attempts_and_ref_subject_alias
--
-- Melengkapi RLS untuk 2 tabel yang masih terbuka di production:
--   1. ai_generation_attempts  — RLS sudah didefinisikan di migrasi 20260722200000
--      tapi statusnya disable di production. Di-re-enable + re-create policies.
--   2. ref_subject_alias       — Belum pernah diberi RLS sama sekali.
--      Tambahkan pola standar: authenticated read + admin manage.
--
-- Sifat: IDEMPOTENT. Semua statement pakai IF NOT EXISTS / DROP IF EXISTS / OR REPLACE.

-- =============================================================================
-- 1. ai_generation_attempts — re-enable & re-create policies
-- =============================================================================

ALTER TABLE public.ai_generation_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all attempts" ON public.ai_generation_attempts;
CREATE POLICY "Admins view all attempts" ON public.ai_generation_attempts
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users view own job attempts" ON public.ai_generation_attempts;
CREATE POLICY "Users view own job attempts" ON public.ai_generation_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_content_jobs j
    WHERE j.id = job_id AND j.requested_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role manages attempts" ON public.ai_generation_attempts;
CREATE POLICY "Service role manages attempts" ON public.ai_generation_attempts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 2. ref_subject_alias — enable + policies (mengikuti pola ref_* lainnya)
-- =============================================================================

ALTER TABLE public.ref_subject_alias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read ref_subject_alias" ON public.ref_subject_alias;
CREATE POLICY "Authenticated read ref_subject_alias" ON public.ref_subject_alias
  FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage ref_subject_alias" ON public.ref_subject_alias;
CREATE POLICY "Admins manage ref_subject_alias" ON public.ref_subject_alias
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

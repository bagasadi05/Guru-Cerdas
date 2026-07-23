-- Migration: 20260723010000_remediate_ai_job_ownership_and_rls.sql
-- FASE R2: Deduplikasi, ownership, dan RLS AI Job

-- 1. Tabel ai_content_job_requests untuk tracking subscription pengguna terhadap job
CREATE TABLE IF NOT EXISTS public.ai_content_job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ai_content_jobs(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_active_request UNIQUE (requested_by, job_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_content_job_requests_user ON public.ai_content_job_requests (requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_job_requests_job ON public.ai_content_job_requests (job_id);

-- RLS pada ai_content_job_requests
ALTER TABLE public.ai_content_job_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own job requests" ON public.ai_content_job_requests;
CREATE POLICY "Users view own job requests" ON public.ai_content_job_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Service role manages requests" ON public.ai_content_job_requests;
CREATE POLICY "Service role manages requests" ON public.ai_content_job_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Perbarui RPC enqueue_modul_ajar_ai_job agar mencatat ke ai_content_job_requests
CREATE OR REPLACE FUNCTION public.enqueue_modul_ajar_ai_job(
  p_input_json jsonb,
  p_request_fingerprint text
)
RETURNS public.ai_content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_job public.ai_content_jobs;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated access';
  END IF;

  IF p_request_fingerprint IS NULL OR length(trim(p_request_fingerprint)) = 0 THEN
    RAISE EXCEPTION 'request_fingerprint cannot be empty';
  END IF;

  IF p_input_json IS NULL OR jsonb_typeof(p_input_json) <> 'object' THEN
    RAISE EXCEPTION 'input_json must be a valid JSON object';
  END IF;

  -- 1. Cari job aktif dengan fingerprint yang sama
  SELECT * INTO v_job
  FROM public.ai_content_jobs
  WHERE request_fingerprint = p_request_fingerprint
    AND status IN ('pending', 'processing', 'retry_wait')
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Jika belum ada, buat job baru
  IF v_job.id IS NULL THEN
    BEGIN
      INSERT INTO public.ai_content_jobs (
        requested_by,
        request_fingerprint,
        input_json,
        status
      )
      VALUES (
        v_user_id,
        p_request_fingerprint,
        p_input_json,
        'pending'
      )
      RETURNING * INTO v_job;
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_job
      FROM public.ai_content_jobs
      WHERE request_fingerprint = p_request_fingerprint
        AND status IN ('pending', 'processing', 'retry_wait')
      ORDER BY created_at DESC
      LIMIT 1;
    END;
  END IF;

  -- 3. Catat request user ke ai_content_job_requests
  IF v_job.id IS NOT NULL THEN
    INSERT INTO public.ai_content_job_requests (job_id, requested_by, request_fingerprint)
    VALUES (v_job.id, v_user_id, p_request_fingerprint)
    ON CONFLICT (requested_by, job_id) DO NOTHING;
  END IF;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_modul_ajar_ai_job(jsonb, text) TO authenticated;

-- 3. Perbarui RLS pada ai_content_jobs agar pengguna yang berlangganan job dapat melihatnya
DROP POLICY IF EXISTS "Users view own jobs" ON public.ai_content_jobs;
DROP POLICY IF EXISTS "Admins view all jobs" ON public.ai_content_jobs;
DROP POLICY IF EXISTS "Users view subscribed jobs" ON public.ai_content_jobs;

CREATE POLICY "Users view subscribed jobs" ON public.ai_content_jobs
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ai_content_job_requests r
      WHERE r.job_id = public.ai_content_jobs.id AND r.requested_by = auth.uid()
    )
    OR public.is_admin_user(auth.uid())
  );

-- 4. RPC Admin: Cancel & Retry Job
CREATE OR REPLACE FUNCTION public.cancel_modul_ajar_ai_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin users can cancel jobs';
  END IF;

  UPDATE public.ai_content_jobs
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_job_id
    AND status IN ('pending', 'processing', 'retry_wait');

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_modul_ajar_ai_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin users can retry jobs';
  END IF;

  UPDATE public.ai_content_jobs
  SET status = 'pending',
      attempt_count = 0,
      next_retry_at = NULL,
      locked_at = NULL,
      locked_by = NULL,
      error_code = NULL,
      error_detail = NULL,
      updated_at = now()
  WHERE id = p_job_id
    AND status IN ('failed', 'retry_wait', 'cancelled');

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_modul_ajar_ai_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_modul_ajar_ai_job(uuid) TO authenticated;

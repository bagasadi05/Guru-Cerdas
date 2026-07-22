-- Migration: 20260722200000_create_modul_ajar_ai_pipeline.sql
-- FASE 1: Schema extension for ref_boilerplate_topik metadata, ai_content_jobs, ai_generation_attempts, RPCs, and RLS.

-- ==========================================
-- A. METADATA ref_boilerplate_topik
-- ==========================================

ALTER TABLE public.ref_boilerplate_topik
  ADD COLUMN IF NOT EXISTS request_fingerprint text,
  ADD COLUMN IF NOT EXISTS content_status text,
  ADD COLUMN IF NOT EXISTS generated_by_provider text,
  ADD COLUMN IF NOT EXISTS generated_by_model text,
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS content_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score numeric,
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Constraint for content_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ref_boilerplate_content_status'
  ) THEN
    ALTER TABLE public.ref_boilerplate_topik
      ADD CONSTRAINT check_ref_boilerplate_content_status
      CHECK (content_status IN ('draft_ai', 'draft_manual', 'in_review', 'verified', 'rejected', 'deprecated'));
  END IF;
END $$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ref_boilerplate_content_version'
  ) THEN
    ALTER TABLE public.ref_boilerplate_topik
      ADD CONSTRAINT check_ref_boilerplate_content_version
      CHECK (content_version >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ref_boilerplate_quality_score'
  ) THEN
    ALTER TABLE public.ref_boilerplate_topik
      ADD CONSTRAINT check_ref_boilerplate_quality_score
      CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));
  END IF;
END $$;

-- Backfill data
UPDATE public.ref_boilerplate_topik
SET content_status = CASE WHEN is_verified = true THEN 'verified' ELSE 'draft_manual' END
WHERE content_status IS NULL;

-- Set NOT NULL & DEFAULT after backfill
ALTER TABLE public.ref_boilerplate_topik
  ALTER COLUMN content_status SET DEFAULT 'draft_manual',
  ALTER COLUMN content_status SET NOT NULL;

-- Dual-sync trigger function between content_status and is_verified
CREATE OR REPLACE FUNCTION public.sync_ref_boilerplate_topik_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content_status IS DISTINCT FROM OLD.content_status THEN
    IF NEW.content_status = 'verified' THEN
      NEW.is_verified := true;
    ELSE
      NEW.is_verified := false;
    END IF;
  ELSIF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NEW.is_verified = true THEN
      NEW.content_status := 'verified';
    ELSE
      NEW.content_status := 'draft_manual';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ref_boilerplate_topik_status ON public.ref_boilerplate_topik;
CREATE TRIGGER trigger_sync_ref_boilerplate_topik_status
  BEFORE INSERT OR UPDATE ON public.ref_boilerplate_topik
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ref_boilerplate_topik_status();

-- Partial unique index for active fingerprint
-- Strategy: One active/canonical row per fingerprint in system bank. Revision history is captured via content_version and generation_metadata.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_boilerplate_topik_fingerprint
  ON public.ref_boilerplate_topik (request_fingerprint)
  WHERE request_fingerprint IS NOT NULL AND content_status IN ('draft_ai', 'draft_manual', 'in_review', 'verified');


-- ==========================================
-- B. TABEL ai_content_jobs
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_content_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_json jsonb NOT NULL,
  result_json jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 4,
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  provider text,
  model text,
  error_code text,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT check_ai_jobs_status CHECK (status IN ('pending', 'processing', 'retry_wait', 'completed', 'failed', 'cancelled')),
  CONSTRAINT check_ai_jobs_attempts CHECK (attempt_count >= 0 AND max_attempts >= 1 AND attempt_count <= max_attempts),
  CONSTRAINT check_ai_jobs_fingerprint_not_empty CHECK (length(trim(request_fingerprint)) > 0),
  CONSTRAINT check_ai_jobs_input_json_object CHECK (jsonb_typeof(input_json) = 'object')
);

-- Indexes for ai_content_jobs
CREATE INDEX IF NOT EXISTS idx_ai_content_jobs_requested_by_created ON public.ai_content_jobs (requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_jobs_status_retry ON public.ai_content_jobs (status, next_retry_at) WHERE status IN ('pending', 'retry_wait');
CREATE INDEX IF NOT EXISTS idx_ai_content_jobs_locked_at ON public.ai_content_jobs (locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_content_jobs_fingerprint ON public.ai_content_jobs (request_fingerprint);

-- Partial unique index for active jobs deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_content_jobs_active_fingerprint
  ON public.ai_content_jobs (request_fingerprint)
  WHERE status IN ('pending', 'processing', 'retry_wait');

-- Auto updated_at trigger
DROP TRIGGER IF EXISTS handle_ai_content_jobs_updated_at ON public.ai_content_jobs;
CREATE TRIGGER handle_ai_content_jobs_updated_at
  BEFORE UPDATE ON public.ai_content_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ==========================================
-- C. TABEL ai_generation_attempts
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_generation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ai_content_jobs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  provider text NOT NULL,
  model text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  latency_ms integer,
  http_status integer,
  input_tokens integer,
  output_tokens integer,
  cached_tokens integer,
  error_category text,
  error_detail text,
  provider_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_ai_attempts_number CHECK (attempt_number >= 1),
  CONSTRAINT check_ai_attempts_latency CHECK (latency_ms IS NULL OR latency_ms >= 0),
  CONSTRAINT check_ai_attempts_tokens CHECK (
    (input_tokens IS NULL OR input_tokens >= 0) AND
    (output_tokens IS NULL OR output_tokens >= 0) AND
    (cached_tokens IS NULL OR cached_tokens >= 0)
  ),
  CONSTRAINT unique_job_attempt_number UNIQUE (job_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_attempts_job_id ON public.ai_generation_attempts (job_id, attempt_number ASC);


-- ==========================================
-- D. RPC enqueue_modul_ajar_ai_job
-- ==========================================

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
  v_existing_job public.ai_content_jobs;
  v_new_job public.ai_content_jobs;
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

  -- 1. Look for active job with same fingerprint
  SELECT * INTO v_existing_job
  FROM public.ai_content_jobs
  WHERE request_fingerprint = p_request_fingerprint
    AND status IN ('pending', 'processing', 'retry_wait')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_job.id IS NOT NULL THEN
    RETURN v_existing_job;
  END IF;

  -- 2. Insert new pending job with unique_violation race-condition handler
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
    RETURNING * INTO v_new_job;

    RETURN v_new_job;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing_job
    FROM public.ai_content_jobs
    WHERE request_fingerprint = p_request_fingerprint
      AND status IN ('pending', 'processing', 'retry_wait')
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_existing_job;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_modul_ajar_ai_job(jsonb, text) TO authenticated;


-- ==========================================
-- E. RPC claim_next_modul_ajar_ai_job
-- ==========================================

CREATE OR REPLACE FUNCTION public.claim_next_modul_ajar_ai_job(
  p_worker_id text
)
RETURNS public.ai_content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id uuid;
  v_claimed_job public.ai_content_jobs;
BEGIN
  SELECT id INTO v_target_id
  FROM public.ai_content_jobs
  WHERE (status = 'pending' OR (status = 'retry_wait' AND next_retry_at <= now()))
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.ai_content_jobs
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = attempt_count + 1,
      updated_at = now()
  WHERE id = v_target_id
  RETURNING * INTO v_claimed_job;

  RETURN v_claimed_job;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_next_modul_ajar_ai_job(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_modul_ajar_ai_job(text) TO service_role;


-- ==========================================
-- F. RPC release_stale_modul_ajar_ai_jobs
-- ==========================================

CREATE OR REPLACE FUNCTION public.release_stale_modul_ajar_ai_jobs(
  p_lease_duration_seconds integer DEFAULT 120
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer := 0;
  v_stale_cutoff timestamptz;
BEGIN
  v_stale_cutoff := now() - (p_lease_duration_seconds || ' seconds')::interval;

  -- 1. Retryable jobs (< max_attempts)
  WITH retry_jobs AS (
    UPDATE public.ai_content_jobs
    SET status = 'retry_wait',
        locked_at = NULL,
        locked_by = NULL,
        next_retry_at = now() + interval '30 seconds',
        updated_at = now()
    WHERE status = 'processing'
      AND locked_at IS NOT NULL
      AND locked_at < v_stale_cutoff
      AND attempt_count < max_attempts
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM retry_jobs;

  -- 2. Failed jobs (>= max_attempts)
  WITH failed_jobs AS (
    UPDATE public.ai_content_jobs
    SET status = 'failed',
        locked_at = NULL,
        locked_by = NULL,
        error_code = 'LEASE_TIMEOUT_MAX_ATTEMPTS',
        error_detail = 'Worker lease timed out and job reached maximum attempts',
        updated_at = now()
    WHERE status = 'processing'
      AND locked_at IS NOT NULL
      AND locked_at < v_stale_cutoff
      AND attempt_count >= max_attempts
    RETURNING id
  )
  SELECT v_updated_count + count(*) INTO v_updated_count FROM failed_jobs;

  RETURN v_updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_stale_modul_ajar_ai_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_modul_ajar_ai_jobs(integer) TO service_role;


-- ==========================================
-- G. RLS POLICIES
-- ==========================================

-- 1. ai_content_jobs
ALTER TABLE public.ai_content_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own jobs" ON public.ai_content_jobs;
CREATE POLICY "Users view own jobs" ON public.ai_content_jobs
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "Admins view all jobs" ON public.ai_content_jobs;
CREATE POLICY "Admins view all jobs" ON public.ai_content_jobs
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Service role manages all jobs" ON public.ai_content_jobs;
CREATE POLICY "Service role manages all jobs" ON public.ai_content_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 2. ai_generation_attempts
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


-- ==========================================
-- H. HARDENING LEGACY ai_generation_queue
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view queue" ON public.ai_generation_queue;

DROP POLICY IF EXISTS "Users view own queue items" ON public.ai_generation_queue;
CREATE POLICY "Users view own queue items" ON public.ai_generation_queue
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

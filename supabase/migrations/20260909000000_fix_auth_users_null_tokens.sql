-- =============================================================================
-- Migration: 20260909000000_fix_auth_users_null_tokens.sql
-- Fix: Supabase Auth (GoTrue) "Database error querying schema" (500)
--
-- Description:
-- Supabase Auth server (GoTrue) expects token and string fields in auth.users
-- to be non-null strings ('' instead of NULL). When users are inserted via
-- direct SQL or third-party tools, columns left as NULL cause Go's SQL scanner
-- to fail with:
--   "Scan error on column ...: converting NULL to string is unsupported"
-- resulting in the error: "Database error querying schema".
--
-- Running this script in Supabase Dashboard -> SQL Editor resolves the error
-- immediately for all affected accounts (such as agung.susanto@guru.local).
-- =============================================================================

UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, '')
WHERE confirmation_token IS NULL 
   OR email_change IS NULL 
   OR email_change_token_new IS NULL 
   OR recovery_token IS NULL
   OR email_change_token_current IS NULL
   OR reauthentication_token IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL;

-- 2. Fast short-circuit for student behavior / attendance RLS function
-- If p_user_id is NULL (e.g. unauthenticated or expired session query),
-- immediately return false without doing a full scan across student/assignment tables.
CREATE OR REPLACE FUNCTION public.can_access_student_behavior_record(
    p_user_id uuid,
    p_student_id uuid,
    p_semester_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL OR p_student_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = p_student_id
          AND s.deleted_at IS NULL
          AND (
              public.is_admin_user(p_user_id)
              OR s.user_id = p_user_id
              OR public.has_teacher_class_assignment(
                  p_user_id,
                  s.class_id,
                  p_semester_id,
                  ARRAY['homeroom', 'subject_teacher'],
                  NULL
              )
          )
    );
END;
$$;


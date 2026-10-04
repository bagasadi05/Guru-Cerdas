CREATE TABLE public.user_notification_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    task_reminders boolean NOT NULL DEFAULT true,
    task_reminder_days smallint NOT NULL DEFAULT 1 CHECK (task_reminder_days BETWEEN 0 AND 3),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_notification_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;
GRANT ALL ON public.user_notification_preferences TO service_role;
CREATE POLICY notification_preferences_owner_select ON public.user_notification_preferences
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY notification_preferences_owner_insert ON public.user_notification_preferences
    FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notification_preferences_owner_update ON public.user_notification_preferences
    FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.teacher_reminder_deliveries (
    kind text NOT NULL CHECK (kind IN ('schedule', 'task-digest')),
    entity_id uuid NOT NULL,
    occurrence_date date NOT NULL,
    subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
    lease_token uuid,
    lease_until timestamptz,
    delivered_at timestamptz,
    terminal boolean NOT NULL DEFAULT false,
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    PRIMARY KEY (kind, entity_id, occurrence_date, subscription_id)
);
ALTER TABLE public.teacher_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_reminder_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.teacher_reminder_deliveries TO service_role;

CREATE FUNCTION public.claim_teacher_reminder(
    p_kind text, p_entity_id uuid, p_occurrence_date date, p_subscription_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_token uuid;
BEGIN
    INSERT INTO public.teacher_reminder_deliveries AS d (
        kind, entity_id, occurrence_date, subscription_id, lease_token, lease_until, attempts
    )
    SELECT p_kind, p_entity_id, p_occurrence_date, ps.id, gen_random_uuid(), now() + interval '2 minutes', 1
    FROM public.push_subscriptions ps
    WHERE ps.id = p_subscription_id AND ps.is_active
      AND ps.user_id IS NOT NULL AND ps.student_id IS NULL
    ON CONFLICT (kind, entity_id, occurrence_date, subscription_id) DO UPDATE
    SET lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes',
        attempts = d.attempts + 1, last_error = NULL
    WHERE d.delivered_at IS NULL AND NOT d.terminal
      AND (d.lease_until IS NULL OR d.lease_until <= now())
    RETURNING lease_token INTO v_token;
    RETURN v_token;
END;
$$;

CREATE FUNCTION public.finish_teacher_reminder(
    p_kind text, p_entity_id uuid, p_occurrence_date date, p_subscription_id uuid,
    p_lease_token uuid, p_success boolean, p_terminal boolean DEFAULT false, p_error text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.teacher_reminder_deliveries
    SET delivered_at = CASE WHEN p_success THEN now() ELSE NULL END,
        terminal = p_terminal, last_error = left(p_error, 200), lease_until = NULL
    WHERE kind = p_kind AND entity_id = p_entity_id AND occurrence_date = p_occurrence_date
      AND subscription_id = p_subscription_id AND lease_token = p_lease_token
      AND delivered_at IS NULL;
    RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_teacher_reminder(text, uuid, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_teacher_reminder(text, uuid, date, uuid, uuid, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_teacher_reminder(text, uuid, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_teacher_reminder(text, uuid, date, uuid, uuid, boolean, boolean, text) TO service_role;

CREATE FUNCTION public.invoke_teacher_reminder_dispatch() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_secret text; v_url text;
BEGIN
    v_secret := public.get_app_config('dispatch_push_secret');
    IF v_secret IS NULL OR v_secret = '' THEN
        RAISE EXCEPTION 'dispatch_push_secret is not configured';
    END IF;
    v_url := coalesce(nullif(current_setting('app.settings.supabase_url', true), ''),
        'https://fddvcyqbfqydvsfujcxd.supabase.co');
    RETURN net.http_post(
        url := v_url || '/functions/v1/dispatch-push',
        headers := jsonb_build_object('Content-Type', 'application/json', 'X-Internal-Secret', v_secret),
        body := jsonb_build_object('mode', 'all', 'source', 'pg_cron'),
        timeout_milliseconds := 30000
    );
END;
$$;
REVOKE ALL ON FUNCTION public.invoke_teacher_reminder_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_teacher_reminder_dispatch() TO service_role;

DO $$
DECLARE v_job bigint;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-notifications') THEN
        v_job := cron.schedule('dispatch-scheduled-notifications', '*/5 * * * *',
            'SELECT public.invoke_teacher_reminder_dispatch();');
        PERFORM cron.alter_job(v_job, active := false);
    END IF;
    PERFORM cron.alter_job(jobid, active := false) FROM cron.job
    WHERE jobname IN ('dispatch-push-hourly', 'dispatch-push-quarterly', 'reset-schedule-reminded');
END;
$$;

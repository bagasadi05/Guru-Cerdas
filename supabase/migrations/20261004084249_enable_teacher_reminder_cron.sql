-- Apply after the frontend release and a successful controlled device test.
DO $$
DECLARE v_job cron.job%ROWTYPE;
BEGIN
    SELECT * INTO STRICT v_job FROM cron.job
    WHERE jobname = 'dispatch-scheduled-notifications';
    IF v_job.schedule <> '*/5 * * * *'
       OR v_job.command <> 'SELECT public.invoke_teacher_reminder_dispatch();' THEN
        RAISE EXCEPTION 'Teacher reminder cron configuration does not match the release';
    END IF;
    IF coalesce(public.get_app_config('dispatch_push_secret'), '') = '' THEN
        RAISE EXCEPTION 'Internal dispatch secret is missing';
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE active AND jobname IN (
        'dispatch-push-hourly', 'dispatch-push-quarterly', 'reset-schedule-reminded'
    )) THEN
        RAISE EXCEPTION 'A legacy reminder cron is still active';
    END IF;
    PERFORM cron.alter_job(v_job.jobid, active := true);
END;
$$;

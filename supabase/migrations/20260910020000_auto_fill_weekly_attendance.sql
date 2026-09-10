-- =============================================================================
-- Migration: 20260910020000_auto_fill_weekly_attendance.sql
-- Description: Stored procedure and weekly cron job to auto-fill missing weekday
--              attendance records as 'Hadir' (Exception-based Attendance pattern).
-- Schedule: Every Saturday at 17:00 WIB (10:00 UTC) via pg_cron.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_fill_weekly_missing_attendance(
    p_class_id UUID DEFAULT NULL,
    p_target_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT '[Auto-fill Sistem: Hadir]'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user UUID;
    v_is_lead BOOLEAN := FALSE;
    v_target_date DATE;
    v_monday DATE;
    v_friday DATE;
    v_cur_day DATE;
    v_fallback_admin UUID;
    v_class RECORD;
    v_walas_id UUID;
    v_semester_id UUID;
    v_total_inserted INT := 0;
    v_affected_classes INT := 0;
    v_inserted_for_day INT;
    v_class_had_insert BOOLEAN;
BEGIN
    -- 1. Authorization check if invoked via client RPC
    v_calling_user := auth.uid();
    IF v_calling_user IS NOT NULL THEN
        v_is_lead := public.is_leadership(v_calling_user);
        IF p_class_id IS NOT NULL THEN
            IF NOT v_is_lead AND NOT EXISTS (
                SELECT 1
                FROM public.teacher_class_assignments tca
                WHERE tca.class_id = p_class_id
                  AND tca.teacher_user_id = v_calling_user
                  AND tca.assignment_role = 'homeroom'
                  AND tca.deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION 'Akses ditolak: Hanya wali kelas atau pimpinan yang dapat mengisi absensi otomatis kelas ini.';
            END IF;
        ELSE
            -- Calling for ALL classes requires leadership/admin
            IF NOT v_is_lead THEN
                RAISE EXCEPTION 'Akses ditolak: Hanya pimpinan/admin yang dapat menjalankan auto-fill untuk seluruh kelas.';
            END IF;
        END IF;
    END IF;

    -- 2. Determine target date (default to Asia/Jakarta current date)
    v_target_date := COALESCE(p_target_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE);
    v_monday := DATE_TRUNC('week', v_target_date)::DATE;
    -- Do not fill into future days if called mid-week
    v_friday := LEAST((v_monday + INTERVAL '4 days')::DATE, v_target_date);

    -- 3. Determine fallback administrator user ID for classes without homeroom
    SELECT ur.user_id INTO v_fallback_admin
    FROM public.user_roles ur
    WHERE ur.role = 'admin' AND ur.deleted_at IS NULL
    ORDER BY ur.created_at ASC
    LIMIT 1;

    -- If still null, fallback to the calling user
    IF v_fallback_admin IS NULL THEN
        v_fallback_admin := v_calling_user;
    END IF;

    -- 4. Loop through active classes
    FOR v_class IN
        SELECT c.id, c.name
        FROM public.classes c
        WHERE c.deleted_at IS NULL 
          AND c.is_archived = false
          AND (p_class_id IS NULL OR c.id = p_class_id)
        ORDER BY c.name
    LOOP
        -- Get active homeroom teacher for class
        SELECT tca.teacher_user_id INTO v_walas_id
        FROM public.teacher_class_assignments tca
        WHERE tca.class_id = v_class.id
          AND tca.assignment_role = 'homeroom'
          AND tca.deleted_at IS NULL
        LIMIT 1;

        v_class_had_insert := FALSE;

        -- Iterate through weekdays (Monday to Friday or up to target date)
        FOR v_cur_day IN
            SELECT generate_series(v_monday, v_friday, INTERVAL '1 day')::DATE
        LOOP
            -- Get active semester for that date
            v_semester_id := public.get_semester_id_for_date(v_cur_day);
            IF v_semester_id IS NULL THEN
                CONTINUE;
            END IF;

            -- Check if class already has attendance records on that day
            IF NOT EXISTS (
                SELECT 1
                FROM public.attendance a
                JOIN public.students s ON s.id = a.student_id
                WHERE s.class_id = v_class.id
                  AND a.date = v_cur_day
                  AND a.deleted_at IS NULL
            ) THEN
                -- Insert 'Hadir' for all active students in class
                INSERT INTO public.attendance (
                    student_id,
                    date,
                    status,
                    user_id,
                    teacher_id,
                    semester_id,
                    notes
                )
                SELECT
                    s.id,
                    v_cur_day,
                    'Hadir'::attendance_status,
                    COALESCE(v_walas_id, v_fallback_admin),
                    v_walas_id,
                    v_semester_id,
                    p_notes
                FROM public.students s
                WHERE s.class_id = v_class.id
                  AND s.deleted_at IS NULL
                ON CONFLICT (student_id, date) DO NOTHING;

                GET DIAGNOSTICS v_inserted_for_day = ROW_COUNT;
                IF v_inserted_for_day > 0 THEN
                    v_total_inserted := v_total_inserted + v_inserted_for_day;
                    v_class_had_insert := TRUE;
                END IF;
            END IF;
        END LOOP;

        IF v_class_had_insert THEN
            v_affected_classes := v_affected_classes + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', v_target_date,
        'week_start', v_monday,
        'week_end', v_friday,
        'total_inserted', v_total_inserted,
        'affected_classes', v_affected_classes
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_fill_weekly_missing_attendance TO authenticated, service_role;

-- Register pg_cron schedule (Every Saturday at 17:00 WIB / 10:00 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('auto-fill-weekly-attendance')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'auto-fill-weekly-attendance'
        );

        PERFORM cron.schedule(
            'auto-fill-weekly-attendance',
            '0 10 * * 6',
            'SELECT public.auto_fill_weekly_missing_attendance();'
        );
    END IF;
END $$;

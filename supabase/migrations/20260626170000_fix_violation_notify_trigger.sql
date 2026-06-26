-- Fix: notify_homeroom_on_violation referenced NEW.reported_by which does not exist
-- on public.violations (recorder is stored in user_id). This caused INSERT to fail
-- with 400 (record "new" has no field "reported_by") whenever the student's class
-- had a homeroom teacher assigned. Idempotent via CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.notify_homeroom_on_violation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_homeroom_user_id uuid;
    v_student_name text;
    v_total_points integer;
    v_waka_user_id uuid;
BEGIN
    -- Get student name
    SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;
    
    -- Get homeroom teacher
    SELECT teacher_user_id INTO v_homeroom_user_id 
    FROM public.teacher_class_assignments tca
    JOIN public.students s ON s.class_id = tca.class_id
    WHERE s.id = NEW.student_id AND tca.assignment_role = 'homeroom' AND tca.deleted_at IS NULL
    LIMIT 1;

    -- Calculate new total points for this student
    SELECT SUM(points) INTO v_total_points 
    FROM public.violations 
    WHERE student_id = NEW.student_id AND deleted_at IS NULL;

    -- If homeroom teacher exists and the reporter is NOT the homeroom teacher, notify homeroom
    IF v_homeroom_user_id IS NOT NULL AND v_homeroom_user_id != NEW.user_id THEN
        INSERT INTO public.internal_notifications (user_id, title, message, type, action_url)
        VALUES (
            v_homeroom_user_id,
            'Laporan Pelanggaran Baru',
            v_student_name || ' mendapatkan laporan pelanggaran baru sebesar ' || NEW.points || ' poin.',
            'warning',
            '/students/' || NEW.student_id || '?tab=violations'
        );
    END IF;

    -- If total points >= 50, notify Waka Kesiswaan
    IF v_total_points >= 50 THEN
        FOR v_waka_user_id IN 
            SELECT user_id FROM public.user_roles WHERE role = 'waka_kesiswaan' AND deleted_at IS NULL
        LOOP
            INSERT INTO public.internal_notifications (user_id, title, message, type, action_url)
            VALUES (
                v_waka_user_id,
                'Peringatan Kritis: Poin Pelanggaran',
                v_student_name || ' telah mencapai ' || v_total_points || ' poin pelanggaran. Memerlukan penanganan segera.',
                'danger',
                '/students/' || NEW.student_id || '?tab=violations'
            );
        END LOOP;
        
        -- Also alert homeroom teacher if it hit 50
        IF v_homeroom_user_id IS NOT NULL THEN
            INSERT INTO public.internal_notifications (user_id, title, message, type, action_url)
            VALUES (
                v_homeroom_user_id,
                'Batas Kritis Poin Siswa',
                v_student_name || ' mencapai ' || v_total_points || ' poin pelanggaran. Segera lakukan bimbingan / pemanggilan.',
                'danger',
                '/students/' || NEW.student_id || '?tab=violations'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

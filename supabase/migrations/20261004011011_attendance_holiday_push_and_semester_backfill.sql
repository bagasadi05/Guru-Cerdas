-- =============================================================================
-- Migration: attendance_holiday_push_and_semester_backfill
-- Tanggal  : 2026-10-04
--
-- 1. auto_fill_weekly_missing_attendance melewati hari libur sekolah.
--    Belum ada kalender libur terpusat, sehingga kelas yang lupa mengisi absensi
--    pada tanggal merah otomatis tercatat "Hadir" semua (contoh 17 Agustus:
--    155 Hadir vs 89 Libur). Kini hari yang mayoritas barisnya sudah "Libur"
--    di seluruh sekolah dianggap libur dan tidak diisi otomatis.
--
-- 2. Notifikasi push absensi hanya untuk input guru yang relevan bagi orang tua.
--    Trigger lama mengirim push untuk setiap baris, termasuk "Hadir" hasil
--    auto-fill sistem, status "Libur", dan koreksi tanggal lama. Setelah VAPID
--    dipasang, itu akan membanjiri orang tua dengan notifikasi yang bukan berita.
--
-- 3. Backfill semester_id (UPDATE saja, tidak ada baris yang dihapus):
--    - 170 baris absensi 13-14 Juli 2026 tanpa semester_id (dibuat sebelum
--      trigger semester ada). Trigger push tidak terpicu karena status/tanggal
--      tidak berubah.
--    - 2 baris pelanggaran dengan semester kosong/tidak sesuai tanggal.
--
-- 4. CHECK points <= max_points untuk quiz_points baru (NOT VALID: 6 baris lama
--    bernilai 2/1 dari 11 Agustus tidak diubah karena memengaruhi nilai Bintang).
-- =============================================================================

-- 1 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_fill_weekly_missing_attendance(p_class_id uuid DEFAULT NULL::uuid, p_target_date date DEFAULT NULL::date, p_notes text DEFAULT '[Auto-fill Sistem: Hadir]'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            IF NOT v_is_lead THEN
                RAISE EXCEPTION 'Akses ditolak: Hanya pimpinan/admin yang dapat menjalankan auto-fill untuk seluruh kelas.';
            END IF;
        END IF;
    END IF;

    v_target_date := COALESCE(p_target_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE);
    v_monday := DATE_TRUNC('week', v_target_date)::DATE;
    v_friday := LEAST((v_monday + INTERVAL '4 days')::DATE, v_target_date);

    SELECT ur.user_id INTO v_fallback_admin
    FROM public.user_roles ur
    WHERE ur.role = 'admin' AND ur.deleted_at IS NULL
    ORDER BY ur.created_at ASC
    LIMIT 1;

    IF v_fallback_admin IS NULL THEN
        v_fallback_admin := v_calling_user;
    END IF;

    FOR v_class IN
        SELECT c.id, c.name
        FROM public.classes c
        WHERE c.deleted_at IS NULL
          AND c.is_archived = false
          AND (p_class_id IS NULL OR c.id = p_class_id)
        ORDER BY c.name
    LOOP
        SELECT tca.teacher_user_id INTO v_walas_id
        FROM public.teacher_class_assignments tca
        WHERE tca.class_id = v_class.id
          AND tca.assignment_role = 'homeroom'
          AND tca.deleted_at IS NULL
        LIMIT 1;

        v_class_had_insert := FALSE;

        FOR v_cur_day IN
            SELECT generate_series(v_monday, v_friday, INTERVAL '1 day')::DATE
        LOOP
            v_semester_id := public.get_semester_id_for_date(v_cur_day);
            IF v_semester_id IS NULL THEN
                CONTINUE;
            END IF;

            -- No central holiday calendar yet: a day that most recorded rows
            -- school-wide already mark "Libur" is a school holiday, not a day to fill.
            IF EXISTS (
                SELECT 1
                FROM public.attendance a
                WHERE a.date = v_cur_day
                  AND a.deleted_at IS NULL
                HAVING count(*) > 0
                   AND count(*) FILTER (WHERE a.status = 'Libur') * 2 >= count(*)
            ) THEN
                CONTINUE;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.attendance a
                JOIN public.students s ON s.id = a.student_id
                WHERE s.class_id = v_class.id
                  AND a.date = v_cur_day
                  AND a.deleted_at IS NULL
            ) THEN
                INSERT INTO public.attendance (
                    student_id, date, status, user_id, teacher_id, semester_id, notes
                )
                SELECT
                    s.id, v_cur_day, 'Hadir'::attendance_status,
                    COALESCE(v_walas_id, v_fallback_admin), v_walas_id, v_semester_id, p_notes
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
$function$;

-- 2 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_attendance_inserted_or_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_student_name text;
  v_status_label text;
  v_payload jsonb;
begin
  if (TG_OP = 'UPDATE' and OLD.status = NEW.status and OLD.date = NEW.date) then
    return NEW;
  end if;

  -- Parents only need news a teacher entered for today/yesterday: system
  -- auto-fill, holidays and back-dated corrections are skipped.
  if NEW.deleted_at is not null
     or NEW.status::text = 'Libur'
     or coalesce(NEW.notes, '') like '[Auto-fill%'
     or NEW.date < ((now() at time zone 'Asia/Jakarta')::date - 1) then
    return NEW;
  end if;

  select name into v_student_name from public.students where id = NEW.student_id;

  v_status_label := case NEW.status::text
    when 'present' then 'Hadir'
    when 'sick' then 'Sakit'
    when 'permission' then 'Izin'
    when 'absent' then 'Alpha'
    else NEW.status::text
  end;

  v_payload := jsonb_build_object(
    'title', '🕒 Absensi Siswa',
    'body', format('%s tercatat %s pada tanggal %s.',
              v_student_name,
              v_status_label,
              to_char(NEW.date, 'DD-MM-YYYY')
            )
  );

  perform public.invoke_dispatch_push_instant(NEW.student_id, 'attendance_input', v_payload);
  return NEW;
end;
$function$;

-- 3 ---------------------------------------------------------------------------
UPDATE public.attendance a
SET semester_id = public.get_semester_id_for_date(a.date)
WHERE a.semester_id IS NULL
  AND public.get_semester_id_for_date(a.date) IS NOT NULL;

UPDATE public.violations v
SET semester_id = s.id
FROM public.semesters s
WHERE s.deleted_at IS NULL
  AND v.date BETWEEN s.start_date AND s.end_date
  AND v.semester_id IS DISTINCT FROM s.id;

-- 4 ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_quiz_points_within_max') THEN
    ALTER TABLE public.quiz_points
      ADD CONSTRAINT check_quiz_points_within_max
      CHECK (points >= 0 AND (max_points IS NULL OR points <= max_points)) NOT VALID;
  END IF;
END $$;

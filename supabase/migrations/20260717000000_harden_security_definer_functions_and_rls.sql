-- Migration: Harden Security Definer Functions and Enable RLS
-- Description: Adds auth checks to critical security definer functions, revokes execution from PUBLIC, and enables RLS on export/reference/lesson tables.

-- =====================================================
-- 1. HARDEN SECURITY DEFINER FUNCTIONS (AUTH CHECKS)
-- =====================================================

-- 1a. public.get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Authenticated user or service_role check
  IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN (SELECT role FROM public.user_roles WHERE user_id = p_user_id);
END;
$$;

-- 1b. public.bulk_insert_grades
CREATE OR REPLACE FUNCTION public.bulk_insert_grades(
    p_grades JSONB,
    p_teacher_id UUID
)
RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_grade JSONB;
    v_inserted_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_validation JSONB;
    v_active_semester_id UUID;
BEGIN
    -- Validate caller matches the teacher identity (or is service_role)
    IF auth.role() != 'service_role' AND (auth.uid() IS NULL OR auth.uid() != p_teacher_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized. Anda hanya dapat memasukkan nilai atas nama diri sendiri.',
            'code', 'UNAUTHORIZED'
        );
    END IF;

    -- Get active semester ID for validation
    SELECT id INTO v_active_semester_id FROM public.semesters WHERE is_active = true LIMIT 1;

    -- Check rate limit first
    IF NOT public.check_rate_limit(p_teacher_id, 'bulk_insert_grades', 10, 60) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Rate limit exceeded. Tunggu beberapa saat sebelum mencoba lagi.',
            'code', 'RATE_LIMIT'
        );
    END IF;

    -- Process each grade
    FOR v_grade IN SELECT * FROM jsonb_array_elements(p_grades)
    LOOP
        -- Check permission to insert for this specific student
        IF auth.role() != 'service_role' AND NOT public.can_access_student_grade_record(
            p_teacher_id, 
            (v_grade->>'student_id')::UUID, 
            v_active_semester_id, 
            v_grade->>'subject'
        ) THEN
            v_failed_count := v_failed_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'student_id', v_grade->>'student_id',
                'errors', array_to_json(array['Anda tidak memiliki akses untuk memberikan nilai pada siswa/mata pelajaran ini.'])
            );
            CONTINUE;
        END IF;

        -- Validate
        v_validation := public.validate_grade_input(
            (v_grade->>'student_id')::UUID,
            v_grade->>'subject',
            (v_grade->>'score')::NUMERIC,
            v_grade->>'assessment_name'
        );
        
        IF (v_validation->>'valid')::BOOLEAN THEN
            -- Insert the grade
            INSERT INTO public.academic_records (
                student_id,
                teacher_id,
                subject,
                score,
                assessment_name,
                notes,
                created_at
            ) VALUES (
                (v_grade->>'student_id')::UUID,
                p_teacher_id,
                v_grade->>'subject',
                (v_grade->>'score')::NUMERIC,
                v_grade->>'assessment_name',
                v_grade->>'notes',
                NOW()
            )
            ON CONFLICT (student_id, subject, assessment_name) 
            DO UPDATE SET 
                score = EXCLUDED.score,
                notes = EXCLUDED.notes,
                updated_at = NOW();
                
            v_inserted_count := v_inserted_count + 1;
        ELSE
            v_failed_count := v_failed_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'student_id', v_grade->>'student_id',
                'errors', v_validation->'errors'
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'inserted', v_inserted_count,
        'failed', v_failed_count,
        'errors', v_errors
    );
END;
$$;

-- 1c. public.update_grade_with_version
CREATE OR REPLACE FUNCTION public.update_grade_with_version(
    p_record_id UUID,
    p_score NUMERIC,
    p_notes TEXT,
    p_expected_version INTEGER
)
RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_current_version INTEGER;
    v_student_id UUID;
    v_semester_id UUID;
    v_subject TEXT;
    v_updated BOOLEAN;
BEGIN
    -- Get current version, student_id, semester_id, subject
    SELECT version, student_id, semester_id, subject 
    INTO v_current_version, v_student_id, v_semester_id, v_subject
    FROM public.academic_records WHERE id = p_record_id;
    
    IF v_current_version IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Record tidak ditemukan',
            'code', 'NOT_FOUND'
        );
    END IF;
    
    -- Validate caller has access to update this record based on class/homeroom assignment
    IF auth.role() != 'service_role' AND (
        auth.uid() IS NULL OR 
        NOT public.can_access_student_grade_record(auth.uid(), v_student_id, v_semester_id, v_subject)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Check version match
    IF v_current_version != p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Data telah diubah oleh pengguna lain. Muat ulang halaman.',
            'code', 'CONFLICT',
            'current_version', v_current_version
        );
    END IF;
    
    -- Update with new version
    UPDATE public.academic_records
    SET score = p_score,
        notes = p_notes,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_record_id AND version = p_expected_version;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated THEN
        RETURN jsonb_build_object(
            'success', true,
            'new_version', p_expected_version + 1
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Gagal mengupdate. Coba lagi.',
            'code', 'UPDATE_FAILED'
        );
    END IF;
END;
$$;


-- =====================================================
-- 2. REVOKE ALL FROM PUBLIC AND GRANT SPECIFIC ROLES
-- =====================================================

-- get_user_role
REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO service_role;

-- sync_users_to_roles
REVOKE ALL ON FUNCTION public.sync_users_to_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_users_to_roles() TO service_role;

-- bulk_insert_grades
REVOKE ALL ON FUNCTION public.bulk_insert_grades(JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_insert_grades(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_insert_grades(JSONB, UUID) TO service_role;

-- update_grade_with_version
REVOKE ALL ON FUNCTION public.update_grade_with_version(UUID, NUMERIC, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_grade_with_version(UUID, NUMERIC, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_grade_with_version(UUID, NUMERIC, TEXT, INTEGER) TO service_role;


-- =====================================================
-- 3. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- 3a. public.export_templates
ALTER TABLE public.export_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own templates" ON public.export_templates;
CREATE POLICY "Users manage own templates" ON public.export_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3b. public.ref_capaian_pembelajaran
ALTER TABLE public.ref_capaian_pembelajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.ref_capaian_pembelajaran;
CREATE POLICY "Authenticated read" ON public.ref_capaian_pembelajaran
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

-- 3c. public.ref_model_pembelajaran
ALTER TABLE public.ref_model_pembelajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.ref_model_pembelajaran;
CREATE POLICY "Authenticated read" ON public.ref_model_pembelajaran
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

-- 3d. public.lesson_plans
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lesson plans" ON public.lesson_plans;
CREATE POLICY "Users manage own lesson plans" ON public.lesson_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3e. public.internal_notifications
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.internal_notifications;
CREATE POLICY "Users view own notifications" ON public.internal_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.internal_notifications;
CREATE POLICY "Users delete own notifications" ON public.internal_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

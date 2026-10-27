-- Migration: Grade Promotion, Class Rolling Deliberation, & Student History
-- Date: 2026-10-27
-- Description:
--   1. Adds status, graduation_year, and last_class_name to public.students.
--   2. Creates public.grade_promotion_batches (with idempotency guard & draft sync).
--   3. Creates public.student_class_histories for historical report cards & 1-click rollback.
--   4. Adds collaborative RLS (Q2) and atomic RPCs (save_grade_promotion_draft,
--      execute_grade_promotion with Q1 teacher assignment cloning, rollback_grade_promotion).

-- 1. Extend public.students with lifecycle columns
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS graduation_year text,
    ADD COLUMN IF NOT EXISTS last_class_name text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'students_status_check'
    ) THEN
        ALTER TABLE public.students
            ADD CONSTRAINT students_status_check
            CHECK (status IN ('active', 'graduated', 'transferred'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_status_active
    ON public.students (status, class_id)
    WHERE deleted_at IS NULL;

-- 2. Create public.grade_promotion_batches
CREATE TABLE IF NOT EXISTS public.grade_promotion_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
    to_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
    from_semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
    to_semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
    draft_allocations jsonb NOT NULL DEFAULT '{}'::jsonb,
    execution_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    copy_teacher_assignments boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'rolled_back')),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    executed_at timestamptz
);

-- Idempotency Guard: Only 1 applied batch per target academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_promotion_batches_applied_year
    ON public.grade_promotion_batches (to_academic_year_id)
    WHERE status = 'applied' AND to_academic_year_id IS NOT NULL;

-- Single shared draft per target academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_promotion_batches_draft_year
    ON public.grade_promotion_batches (to_academic_year_id)
    WHERE status = 'draft' AND to_academic_year_id IS NOT NULL;

-- 3. Create public.student_class_histories
CREATE TABLE IF NOT EXISTS public.student_class_histories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES public.grade_promotion_batches(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    from_class_name text NOT NULL,
    from_user_id uuid,
    from_status text NOT NULL DEFAULT 'active',
    to_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    to_class_name text,
    academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
    action_type text NOT NULL CHECK (action_type IN ('promoted', 'rolled', 'retained', 'graduated')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_class_histories_student_year
    ON public.student_class_histories (student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_student_class_histories_batch
    ON public.student_class_histories (batch_id);

-- 4. Helper Function for Collaborative Deliberation Access (Decision Q2)
CREATE OR REPLACE FUNCTION public.can_collaborate_grade_promotion(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        public.is_admin_user(p_user_id)
        OR EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = p_user_id
              AND ur.role IN ('admin', 'waka_kurikulum', 'kepala_madrasah', 'waka_kesiswaan')
              AND ur.deleted_at IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM public.classes c
            WHERE (c.wali_kelas_id = p_user_id OR c.user_id = p_user_id)
              AND c.deleted_at IS NULL
              AND c.is_archived = false
        )
        OR EXISTS (
            SELECT 1
            FROM public.teacher_class_assignments tca
            WHERE tca.teacher_user_id = p_user_id
              AND tca.assignment_role = 'homeroom'
              AND tca.deleted_at IS NULL
        );
$$;

GRANT EXECUTE ON FUNCTION public.can_collaborate_grade_promotion(uuid) TO authenticated;

-- 5. Enable RLS & Policies (using InitPlan scalar subqueries)
ALTER TABLE public.grade_promotion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grade_promotion_batches_select" ON public.grade_promotion_batches;
CREATE POLICY "grade_promotion_batches_select"
    ON public.grade_promotion_batches
    FOR SELECT
    TO authenticated
    USING (public.can_collaborate_grade_promotion((SELECT auth.uid())));

DROP POLICY IF EXISTS "grade_promotion_batches_insert_draft" ON public.grade_promotion_batches;
CREATE POLICY "grade_promotion_batches_insert_draft"
    ON public.grade_promotion_batches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        status = 'draft'
        AND public.can_collaborate_grade_promotion((SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "grade_promotion_batches_update_draft" ON public.grade_promotion_batches;
CREATE POLICY "grade_promotion_batches_update_draft"
    ON public.grade_promotion_batches
    FOR UPDATE
    TO authenticated
    USING (
        status = 'draft'
        AND public.can_collaborate_grade_promotion((SELECT auth.uid()))
    )
    WITH CHECK (
        status = 'draft'
        AND public.can_collaborate_grade_promotion((SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "student_class_histories_select" ON public.student_class_histories;
CREATE POLICY "student_class_histories_select"
    ON public.student_class_histories
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. RPC: Save Collaborative Deliberation Draft (Decision Q2)
CREATE OR REPLACE FUNCTION public.save_grade_promotion_draft(
    p_from_academic_year_id uuid,
    p_to_academic_year_id uuid,
    p_from_semester_id uuid,
    p_to_semester_id uuid,
    p_draft_allocations jsonb,
    p_copy_teacher_assignments boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_batch_id uuid;
BEGIN
    IF v_user_id IS NULL OR NOT public.can_collaborate_grade_promotion(v_user_id) THEN
        RAISE EXCEPTION 'Anda tidak memiliki izin untuk menyimpan draf musyawarah kenaikan kelas.';
    END IF;

    SELECT id INTO v_batch_id
    FROM public.grade_promotion_batches
    WHERE status = 'draft'
      AND (
          (p_to_academic_year_id IS NOT NULL AND to_academic_year_id = p_to_academic_year_id)
          OR (p_to_academic_year_id IS NULL AND to_academic_year_id IS NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_batch_id IS NOT NULL THEN
        UPDATE public.grade_promotion_batches
        SET from_academic_year_id = COALESCE(p_from_academic_year_id, from_academic_year_id),
            to_academic_year_id = COALESCE(p_to_academic_year_id, to_academic_year_id),
            from_semester_id = COALESCE(p_from_semester_id, from_semester_id),
            to_semester_id = COALESCE(p_to_semester_id, to_semester_id),
            draft_allocations = COALESCE(p_draft_allocations, '{}'::jsonb),
            copy_teacher_assignments = COALESCE(p_copy_teacher_assignments, true),
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_batch_id;
    ELSE
        INSERT INTO public.grade_promotion_batches (
            from_academic_year_id,
            to_academic_year_id,
            from_semester_id,
            to_semester_id,
            draft_allocations,
            copy_teacher_assignments,
            status,
            updated_by
        ) VALUES (
            p_from_academic_year_id,
            p_to_academic_year_id,
            p_from_semester_id,
            p_to_semester_id,
            COALESCE(p_draft_allocations, '{}'::jsonb),
            COALESCE(p_copy_teacher_assignments, true),
            'draft',
            v_user_id
        )
        RETURNING id INTO v_batch_id;
    END IF;

    RETURN v_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_grade_promotion_draft(uuid, uuid, uuid, uuid, jsonb, boolean) TO authenticated;

-- 7. RPC: Execute Atomic Grade Promotion (Admin Only — Decision Q1 & Q2)
CREATE OR REPLACE FUNCTION public.execute_grade_promotion(
    p_from_academic_year_id uuid,
    p_to_academic_year_id uuid,
    p_from_semester_id uuid,
    p_to_semester_id uuid,
    p_graduation_year text,
    p_moves jsonb,
    p_copy_teacher_assignments boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_batch_id uuid;
    v_move jsonb;
    v_student_id uuid;
    v_from_class_id uuid;
    v_from_class_name text;
    v_to_class_id uuid;
    v_to_class_name text;
    v_action_type text;
    v_old_user_id uuid;
    v_old_status text;
    v_new_owner_id uuid;
    v_graduated_count int := 0;
    v_promoted_count int := 0;
    v_rolled_count int := 0;
    v_retained_count int := 0;
    v_copied_assignments int := 0;
    v_summary jsonb;
BEGIN
    IF v_user_id IS NULL OR NOT public.is_admin_user(v_user_id) THEN
        RAISE EXCEPTION 'Hanya Admin yang dapat mengeksekusi penerapan kenaikan kelas final.';
    END IF;

    IF p_moves IS NULL OR jsonb_typeof(p_moves) <> 'array' OR jsonb_array_length(p_moves) = 0 THEN
        RAISE EXCEPTION 'Daftar pemindahan siswa kosong.';
    END IF;

    -- Idempotency Guard check
    IF p_to_academic_year_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.grade_promotion_batches
        WHERE to_academic_year_id = p_to_academic_year_id
          AND status = 'applied'
    ) THEN
        RAISE EXCEPTION 'Kenaikan kelas untuk tahun ajaran tujuan ini sudah pernah diterapkan. Batalkan (Rollback) batch sebelumnya jika ingin mengulang.';
    END IF;

    -- Reuse existing draft batch if present, otherwise create a new batch record
    SELECT id INTO v_batch_id
    FROM public.grade_promotion_batches
    WHERE status = 'draft'
      AND (
          (p_to_academic_year_id IS NOT NULL AND to_academic_year_id = p_to_academic_year_id)
          OR (p_to_academic_year_id IS NULL AND to_academic_year_id IS NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_batch_id IS NULL THEN
        INSERT INTO public.grade_promotion_batches (
            from_academic_year_id,
            to_academic_year_id,
            from_semester_id,
            to_semester_id,
            copy_teacher_assignments,
            status,
            updated_by,
            executed_by,
            executed_at
        ) VALUES (
            p_from_academic_year_id,
            p_to_academic_year_id,
            p_from_semester_id,
            p_to_semester_id,
            COALESCE(p_copy_teacher_assignments, true),
            'applied',
            v_user_id,
            v_user_id,
            now()
        )
        RETURNING id INTO v_batch_id;
    END IF;

    -- Process each student move
    FOR v_move IN SELECT * FROM jsonb_array_elements(p_moves)
    LOOP
        v_student_id := (v_move->>'student_id')::uuid;
        v_from_class_id := NULLIF(v_move->>'from_class_id', '')::uuid;
        v_from_class_name := COALESCE(v_move->>'from_class_name', '-');
        v_to_class_id := NULLIF(v_move->>'to_class_id', '')::uuid;
        v_to_class_name := NULLIF(v_move->>'to_class_name', '');
        v_action_type := COALESCE(v_move->>'action_type', 'promoted');

        SELECT s.user_id, COALESCE(s.status, 'active')
        INTO v_old_user_id, v_old_status
        FROM public.students s
        WHERE s.id = v_student_id;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- 1. Record history snapshot for past report cards & 1-click rollback
        INSERT INTO public.student_class_histories (
            batch_id,
            student_id,
            from_class_id,
            from_class_name,
            from_user_id,
            from_status,
            to_class_id,
            to_class_name,
            academic_year_id,
            action_type
        ) VALUES (
            v_batch_id,
            v_student_id,
            v_from_class_id,
            v_from_class_name,
            v_old_user_id,
            v_old_status,
            v_to_class_id,
            v_to_class_name,
            p_from_academic_year_id,
            v_action_type
        );

        -- 2. Apply transition to student row
        IF v_action_type = 'graduated' THEN
            UPDATE public.students
            SET class_id = NULL,
                status = 'graduated',
                graduation_year = COALESCE(p_graduation_year, to_char(now(), 'YYYY')),
                last_class_name = v_from_class_name
            WHERE id = v_student_id;

            v_graduated_count := v_graduated_count + 1;
        ELSE
            -- Resolve target class homeroom owner so RLS stays aligned
            v_new_owner_id := v_old_user_id;
            IF v_to_class_id IS NOT NULL THEN
                SELECT COALESCE(c.wali_kelas_id, c.user_id, v_old_user_id)
                INTO v_new_owner_id
                FROM public.classes c
                WHERE c.id = v_to_class_id;
            END IF;

            UPDATE public.students
            SET class_id = v_to_class_id,
                user_id = COALESCE(v_new_owner_id, user_id),
                status = 'active',
                last_class_name = v_from_class_name
            WHERE id = v_student_id;

            IF v_action_type = 'rolled' THEN
                v_rolled_count := v_rolled_count + 1;
            ELSIF v_action_type = 'retained' THEN
                v_retained_count := v_retained_count + 1;
            ELSE
                v_promoted_count := v_promoted_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- 3. Copy teacher_class_assignments to new semester if requested (Decision Q1)
    IF COALESCE(p_copy_teacher_assignments, true)
       AND p_from_semester_id IS NOT NULL
       AND p_to_semester_id IS NOT NULL
       AND p_from_semester_id <> p_to_semester_id
    THEN
        INSERT INTO public.teacher_class_assignments (
            teacher_user_id,
            class_id,
            semester_id,
            assignment_role,
            subject_name,
            notes,
            created_by
        )
        SELECT
            tca.teacher_user_id,
            tca.class_id,
            p_to_semester_id,
            tca.assignment_role,
            tca.subject_name,
            tca.notes,
            v_user_id
        FROM public.teacher_class_assignments tca
        WHERE tca.semester_id = p_from_semester_id
          AND tca.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.teacher_class_assignments existing
              WHERE existing.teacher_user_id = tca.teacher_user_id
                AND existing.class_id = tca.class_id
                AND existing.semester_id = p_to_semester_id
                AND existing.assignment_role = tca.assignment_role
                AND COALESCE(lower(existing.subject_name), '') = COALESCE(lower(tca.subject_name), '')
                AND existing.deleted_at IS NULL
          );

        GET DIAGNOSTICS v_copied_assignments = ROW_COUNT;
    END IF;

    v_summary := jsonb_build_object(
        'batch_id', v_batch_id,
        'graduated_count', v_graduated_count,
        'promoted_count', v_promoted_count,
        'rolled_count', v_rolled_count,
        'retained_count', v_retained_count,
        'copied_assignments_count', v_copied_assignments,
        'executed_at', now()
    );

    UPDATE public.grade_promotion_batches
    SET status = 'applied',
        execution_summary = v_summary,
        copy_teacher_assignments = COALESCE(p_copy_teacher_assignments, true),
        executed_by = v_user_id,
        executed_at = now(),
        updated_at = now()
    WHERE id = v_batch_id;

    RETURN v_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_grade_promotion(uuid, uuid, uuid, uuid, text, jsonb, boolean) TO authenticated;

-- 8. RPC: 1-Click Rollback / Undo Grade Promotion (Admin Only)
CREATE OR REPLACE FUNCTION public.rollback_grade_promotion(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_batch record;
    v_hist record;
    v_restored_count int := 0;
BEGIN
    IF v_user_id IS NULL OR NOT public.is_admin_user(v_user_id) THEN
        RAISE EXCEPTION 'Hanya Admin yang dapat membatalkan (rollback) kenaikan kelas.';
    END IF;

    SELECT * INTO v_batch
    FROM public.grade_promotion_batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch kenaikan kelas tidak ditemukan.';
    END IF;

    IF v_batch.status <> 'applied' THEN
        RAISE EXCEPTION 'Batch ini tidak berstatus aktif/applied sehingga tidak dapat di-rollback.';
    END IF;

    FOR v_hist IN
        SELECT *
        FROM public.student_class_histories
        WHERE batch_id = p_batch_id
    LOOP
        UPDATE public.students
        SET class_id = v_hist.from_class_id,
            user_id = COALESCE(v_hist.from_user_id, user_id),
            status = COALESCE(v_hist.from_status, 'active'),
            graduation_year = CASE WHEN COALESCE(v_hist.from_status, 'active') = 'active' THEN NULL ELSE graduation_year END
        WHERE id = v_hist.student_id;

        v_restored_count := v_restored_count + 1;
    END LOOP;

    UPDATE public.grade_promotion_batches
    SET status = 'rolled_back',
        updated_by = v_user_id,
        updated_at = now()
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'batch_id', p_batch_id,
        'restored_count', v_restored_count,
        'rolled_back_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_grade_promotion(uuid) TO authenticated;

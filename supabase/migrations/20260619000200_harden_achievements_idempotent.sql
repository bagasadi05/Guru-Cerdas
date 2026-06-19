-- ============================================
-- Migration: Harden Achievements Idempotent (Portofolio Prestasi Siswa)
-- Created: 2026-06-19
-- Description: Idempotent re-runnable setup for student_achievements table,
--              constraints, trigger, RLS policy, and get_student_portal_data RPC function.
-- ============================================

-- 1. Create student_achievements table idempotently
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'lainnya',
    level TEXT NOT NULL DEFAULT 'sekolah',
    rank TEXT,
    organizer TEXT,
    date DATE NOT NULL,
    description TEXT,
    certificate_url TEXT,
    certificate_name TEXT,
    points INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Value constraints to keep enum-like columns consistent with the app (safe drop and re-add)
ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_category_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_category_check
    CHECK (category IN ('akademik','non_akademik','seni','olahraga','keagamaan','lainnya'));

ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_level_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_level_check
    CHECK (level IN ('sekolah','kecamatan','kabupaten_kota','provinsi','nasional','internasional'));

ALTER TABLE public.student_achievements
    DROP CONSTRAINT IF EXISTS student_achievements_rank_check;
ALTER TABLE public.student_achievements
    ADD CONSTRAINT student_achievements_rank_check
    CHECK (rank IS NULL OR rank IN ('juara_1','juara_2','juara_3','harapan','finalis','partisipan'));

-- 3. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_student_achievements_user_id ON public.student_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_date ON public.student_achievements(date);

-- 4. Enable Row Level Security
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: only the owning teacher can manage their rows
DROP POLICY IF EXISTS "Users can manage their own student achievements" ON public.student_achievements;
CREATE POLICY "Users can manage their own student achievements"
ON public.student_achievements
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_student_achievements_updated_at ON public.student_achievements;
CREATE TRIGGER update_student_achievements_updated_at
BEFORE UPDATE ON public.student_achievements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Update get_student_portal_data RPC to include achievements
DROP FUNCTION IF EXISTS public.get_student_portal_data(uuid, text);

CREATE OR REPLACE FUNCTION public.get_student_portal_data(student_id_param uuid, access_code_param text)
 RETURNS TABLE(
    student json, 
    reports json, 
    "attendanceRecords" json, 
    "academicRecords" json, 
    violations json, 
    "quizPoints" json, 
    communications json, 
    teacher json, 
    schedules json, 
    tasks json, 
    announcements json,
    achievements json
)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 AS $function$
DECLARE
    v_student_record RECORD;
    v_user_id UUID;
    v_class_id UUID;
    v_class_name TEXT;
BEGIN
    -- 1) Verify student access
    SELECT s.*, c.name as class_name, s.user_id as teacher_user_id
    INTO v_student_record
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = student_id_param 
      AND s.access_code = access_code_param;
    
    IF v_student_record IS NULL THEN
        RETURN;
    END IF;
    
    v_user_id := v_student_record.teacher_user_id;
    v_class_id := v_student_record.class_id;
    v_class_name := v_student_record.class_name;
    
    -- 3) Return all data (teacher info from auth.users metadata or default)
    RETURN QUERY
    SELECT
        json_build_object(
            'id', v_student_record.id,
            'name', v_student_record.name,
            'gender', v_student_record.gender,
            'class_id', v_student_record.class_id,
            'avatar_url', v_student_record.avatar_url,
            'access_code', v_student_record.access_code,
            'parent_name', v_student_record.parent_name,
            'parent_phone', v_student_record.parent_phone,
            'classes', json_build_object('name', v_student_record.class_name)
        )::json as student,
        COALESCE((
            SELECT json_agg(row_to_json(r)) 
            FROM reports r 
            WHERE r.student_id = student_id_param
        ), '[]'::json) as reports,
        COALESCE((
            SELECT json_agg(row_to_json(a)) 
            FROM attendance a 
            WHERE a.student_id = student_id_param
        ), '[]'::json) as "attendanceRecords",
        COALESCE((
            SELECT json_agg(row_to_json(ar)) 
            FROM academic_records ar 
            WHERE ar.student_id = student_id_param
        ), '[]'::json) as "academicRecords",
        COALESCE((
            SELECT json_agg(row_to_json(v)) 
            FROM violations v 
            WHERE v.student_id = student_id_param
        ), '[]'::json) as violations,
        COALESCE((
            SELECT json_agg(row_to_json(q)) 
            FROM quiz_points q 
            WHERE q.student_id = student_id_param
        ), '[]'::json) as "quizPoints",
        COALESCE((
            SELECT json_agg(row_to_json(c) ORDER BY c.created_at) 
            FROM communications c 
            WHERE c.student_id = student_id_param
        ), '[]'::json) as communications,
        json_build_object(
            'user_id', v_user_id,
            'full_name', 'Wali Kelas',
            'avatar_url', 'https://i.pravatar.cc/150?u=' || v_user_id::text
        )::json as teacher,
        -- Schedules for the class
        COALESCE((
            SELECT json_agg(row_to_json(sch) ORDER BY 
                CASE 
                    WHEN sch.day = 'Senin' THEN 1
                    WHEN sch.day = 'Selasa' THEN 2
                    WHEN sch.day = 'Rabu' THEN 3
                    WHEN sch.day = 'Kamis' THEN 4
                    WHEN sch.day = 'Jumat' THEN 5
                    WHEN sch.day = 'Sabtu' THEN 6
                    ELSE 7
                END, sch.start_time)
            FROM schedules sch
            WHERE sch.class_id = v_class_name
        ), '[]'::json) as schedules,
        -- Tasks for the class
        COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.due_date DESC)
            FROM tasks t
            WHERE t.class_id = v_class_id
        ), '[]'::json) as tasks,
        -- Latest Announcements
        COALESCE((
            SELECT json_agg(row_to_json(ann) ORDER BY ann.date DESC, ann.created_at DESC)
            FROM (
                SELECT * FROM announcements 
                WHERE audience_type IN ('all', 'parent') 
                ORDER BY date DESC 
                LIMIT 5
            ) ann
        ), '[]'::json) as announcements,
        -- Achievements
        COALESCE((
            SELECT json_agg(row_to_json(ach) ORDER BY ach.date DESC)
            FROM student_achievements ach
            WHERE ach.student_id = student_id_param
        ), '[]'::json) as achievements;
END;
$function$;

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    audience_type TEXT DEFAULT 'all', -- 'all', 'parent', 'student'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users and anonymouse (since portal is public-ish access via code)
-- But effectively we control access via RPC mostly.
-- For safety, allow public read
CREATE POLICY "Allow public read announcements" ON public.announcements FOR SELECT USING (true);


-- Add parent fields to students table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_name') THEN
        ALTER TABLE students ADD COLUMN parent_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_phone') THEN
        ALTER TABLE students ADD COLUMN parent_phone TEXT;
    END IF;
END $$;


-- Create RPC to update parent info
CREATE OR REPLACE FUNCTION public.update_parent_info(
    student_id_param UUID,
    access_code_param TEXT,
    new_parent_name TEXT,
    new_parent_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_found BOOLEAN;
BEGIN
    -- Verify access first
    SELECT EXISTS(
        SELECT 1 FROM students 
        WHERE id = student_id_param 
        AND access_code = access_code_param
    ) INTO v_found;

    IF NOT v_found THEN
        RETURN FALSE;
    END IF;

    -- Update info
    UPDATE students 
    SET 
        parent_name = new_parent_name,
        parent_phone = new_parent_phone,
        updated_at = NOW()
    WHERE id = student_id_param;

    RETURN TRUE;
END;
$$;


-- Update get_student_portal_data to include announcements
-- Drop first because return type is changing
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
    announcements json -- Added this
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
            'parent_name', v_student_record.parent_name, -- Added
            'parent_phone', v_student_record.parent_phone, -- Added
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
        -- Schedules for the class (lookup by class NAME because schedules.class_id uses '3B' etc not uuid)
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
        -- Tasks for the class (lookup by class ID uuid)
        COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.due_date DESC)
            FROM tasks t
            WHERE t.class_id = v_class_id
        ), '[]'::json) as tasks,
        -- Latest Announcements (Top 5)
        COALESCE((
            SELECT json_agg(row_to_json(ann) ORDER BY ann.date DESC, ann.created_at DESC)
            FROM (
                SELECT * FROM announcements 
                WHERE audience_type IN ('all', 'parent') 
                ORDER BY date DESC 
                LIMIT 5
            ) ann
        ), '[]'::json) as announcements;
END;
$function$;

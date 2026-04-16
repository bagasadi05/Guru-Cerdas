-- Harden Row Level Security for teacher-owned tables accessed by the client.
-- Portal parent flows continue to rely on SECURITY DEFINER RPCs and public announcements.

DO $$
DECLARE
    table_name TEXT;
    teacher_owned_tables TEXT[] := ARRAY[
        'academic_records',
        'academic_years',
        'action_history',
        'attendance',
        'classes',
        'communications',
        'extracurricular_students',
        'quiz_points',
        'reports',
        'schedules',
        'semesters',
        'students',
        'tasks',
        'user_roles',
        'violations'
    ];
BEGIN
    FOREACH table_name IN ARRAY teacher_owned_tables
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', table_name);

        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view own rows" ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert own rows" ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update own rows" ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete own rows" ON public.%I', table_name);

        EXECUTE format(
            'CREATE POLICY "Authenticated users can view own rows" ON public.%I FOR SELECT USING (auth.uid() = user_id)',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated users can insert own rows" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated users can update own rows" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated users can delete own rows" ON public.%I FOR DELETE USING (auth.uid() = user_id)',
            table_name
        );
    END LOOP;
END $$;

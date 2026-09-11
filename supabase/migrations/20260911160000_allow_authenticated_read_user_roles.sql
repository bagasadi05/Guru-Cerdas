-- Migration: Allow authenticated users to read user_roles
-- Reason: Teachers and staff need to view teacher/staff display names across the app,
-- such as violation recorders, homeroom teacher signatures on Bintang/Attendance reports,
-- teacher assignment lists, and real-time collaboration notifications.

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view user roles" ON public.user_roles;

CREATE POLICY "Authenticated users can read user roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

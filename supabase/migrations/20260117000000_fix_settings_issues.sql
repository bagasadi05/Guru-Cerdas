-- Fix RLS for academic_years
DROP POLICY IF EXISTS "Enable read access for all users" ON academic_years;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON academic_years;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON academic_years;

-- Re-create policies ensuring user_id check
CREATE POLICY "Users can view own academic years" ON academic_years
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own academic years" ON academic_years
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own academic years" ON academic_years
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own academic years" ON academic_years
    FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS for semesters
DROP POLICY IF EXISTS "Enable read access for all users" ON semesters;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON semesters;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON semesters;

CREATE POLICY "Users can view own semesters" ON semesters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semesters" ON semesters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semesters" ON semesters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own semesters" ON semesters
    FOR DELETE USING (auth.uid() = user_id);

-- Create RPC for atomic activation
CREATE OR REPLACE FUNCTION activate_semester(p_semester_id UUID, p_year_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate ownership (although RLS would handle update, explicit check is good for logic flow)
    IF NOT EXISTS (SELECT 1 FROM semesters WHERE id = p_semester_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Semester not found or access denied';
    END IF;

    -- Deactivate all semesters for this user
    UPDATE semesters SET is_active = false WHERE user_id = auth.uid();
    
    -- Activate target semester
    UPDATE semesters SET is_active = true WHERE id = p_semester_id AND user_id = auth.uid();
    
    -- Deactivate all years for this user
    UPDATE academic_years SET is_active = false WHERE user_id = auth.uid();
    
    -- Activate target year
    UPDATE academic_years SET is_active = true WHERE id = p_year_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

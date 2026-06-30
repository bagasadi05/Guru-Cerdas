-- =====================================================
-- SUPABASE BACKEND IMPROVEMENTS
-- Portal Guru - Mass Grade Input
-- =====================================================

-- =====================================================
-- 1. AUDIT TRAIL / CHANGELOG TABLE
-- =====================================================
-- Tracks all changes made to grades

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Who made the change
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- What was changed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change details
    old_data JSONB,
    new_data JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT
);

-- Index for querying by table and record
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only users can see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);


-- =====================================================
-- 2. TRIGGER FUNCTION FOR AUTO AUDIT LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, user_email, table_name, record_id, action, new_data)
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, user_email, table_name, record_id, action, old_data, new_data)
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, user_email, table_name, record_id, action, old_data)
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to academic_records table
DROP TRIGGER IF EXISTS audit_academic_records ON academic_records;
CREATE TRIGGER audit_academic_records
    AFTER INSERT OR UPDATE OR DELETE ON academic_records
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- =====================================================
-- 3. RATE LIMITING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INTEGER DEFAULT 1,
    
    UNIQUE(user_id, action_type, window_start)
);

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type, window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := date_trunc('hour', NOW()) + 
        (floor(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes || ' minutes')::INTERVAL;
    
    -- Upsert rate limit record
    INSERT INTO rate_limits (user_id, action_type, window_start, request_count)
    VALUES (p_user_id, p_action_type, v_window_start, 1)
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;
    
    -- Check if under limit
    RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. SERVER-SIDE VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION validate_grade_input(
    p_student_id UUID,
    p_subject TEXT,
    p_score NUMERIC,
    p_assessment_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_errors JSONB := '[]'::JSONB;
    v_student_exists BOOLEAN;
    v_kkm NUMERIC := 75; -- Default KKM
BEGIN
    -- Check student exists
    SELECT EXISTS(SELECT 1 FROM students WHERE id = p_student_id) INTO v_student_exists;
    IF NOT v_student_exists THEN
        v_errors := v_errors || jsonb_build_object('field', 'student_id', 'message', 'Siswa tidak ditemukan');
    END IF;
    
    -- Validate score range
    IF p_score IS NULL THEN
        v_errors := v_errors || jsonb_build_object('field', 'score', 'message', 'Nilai tidak boleh kosong');
    ELSIF p_score < 0 OR p_score > 100 THEN
        v_errors := v_errors || jsonb_build_object('field', 'score', 'message', 'Nilai harus antara 0-100');
    END IF;
    
    -- Validate subject
    IF p_subject IS NULL OR p_subject = '' THEN
        v_errors := v_errors || jsonb_build_object('field', 'subject', 'message', 'Mata pelajaran tidak boleh kosong');
    END IF;
    
    -- Validate assessment name
    IF p_assessment_name IS NULL OR p_assessment_name = '' THEN
        v_errors := v_errors || jsonb_build_object('field', 'assessment_name', 'message', 'Nama penilaian tidak boleh kosong');
    END IF;
    
    -- Return result
    RETURN jsonb_build_object(
        'valid', jsonb_array_length(v_errors) = 0,
        'errors', v_errors,
        'warnings', CASE 
            WHEN p_score < v_kkm THEN jsonb_build_array(
                jsonb_build_object('field', 'score', 'message', 'Nilai di bawah KKM (' || v_kkm || ')')
            )
            ELSE '[]'::JSONB
        END
    );
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 5. BATCH INSERT WITH TRANSACTION
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_insert_grades(
    p_grades JSONB,
    p_teacher_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_grade JSONB;
    v_inserted_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_validation JSONB;
BEGIN
    -- Check rate limit first
    IF NOT check_rate_limit(p_teacher_id, 'bulk_insert_grades', 10, 60) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Rate limit exceeded. Tunggu beberapa saat sebelum mencoba lagi.',
            'code', 'RATE_LIMIT'
        );
    END IF;

    -- Process each grade
    FOR v_grade IN SELECT * FROM jsonb_array_elements(p_grades)
    LOOP
        -- Validate
        v_validation := validate_grade_input(
            (v_grade->>'student_id')::UUID,
            v_grade->>'subject',
            (v_grade->>'score')::NUMERIC,
            v_grade->>'assessment_name'
        );
        
        IF (v_validation->>'valid')::BOOLEAN THEN
            -- Insert the grade
            INSERT INTO academic_records (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 6. CONFLICT RESOLUTION (OPTIMISTIC LOCKING)
-- =====================================================

-- Add version column to academic_records if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'academic_records' AND column_name = 'version') THEN
        ALTER TABLE academic_records ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Function to update with version check
CREATE OR REPLACE FUNCTION update_grade_with_version(
    p_record_id UUID,
    p_score NUMERIC,
    p_notes TEXT,
    p_expected_version INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_current_version INTEGER;
    v_updated BOOLEAN;
BEGIN
    -- Get current version
    SELECT version INTO v_current_version
    FROM academic_records WHERE id = p_record_id;
    
    IF v_current_version IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Record tidak ditemukan',
            'code', 'NOT_FOUND'
        );
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
    UPDATE academic_records
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 7. CLEANUP OLD RATE LIMITS (RUN PERIODICALLY)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
1. AUDIT TRAIL
   - Automatically logs INSERT, UPDATE, DELETE on academic_records
   - View audit: SELECT * FROM audit_logs WHERE table_name = 'academic_records';

2. RATE LIMITING
   - Call: SELECT check_rate_limit(auth.uid(), 'action_name', 100, 60);
   - Returns TRUE if under limit, FALSE if exceeded

3. SERVER VALIDATION
   - Call: SELECT validate_grade_input(student_id, subject, score, assessment_name);
   - Returns JSON with valid, errors, warnings

4. BULK INSERT
   - Call: SELECT bulk_insert_grades('[{"student_id": "...", ...}]', teacher_id);
   - Handles validation, rate limiting, and transaction

5. CONFLICT RESOLUTION
   - Call: SELECT update_grade_with_version(record_id, score, notes, expected_version);
   - Prevents overwriting concurrent edits

6. MAINTENANCE
   - Run periodically: SELECT cleanup_old_rate_limits();
*/

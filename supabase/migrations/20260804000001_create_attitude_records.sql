-- Migration: Create attitude_records table for Sikap (KI-1 & KI-2) assessment
-- Supports both Kurikulum 2013 and Kurikulum Merdeka
-- Timestamp: 20260804000001

CREATE TABLE IF NOT EXISTS public.attitude_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT 'Umum',
    assessment_name TEXT NOT NULL DEFAULT 'Sikap',
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    spiritual_predicate TEXT CHECK (spiritual_predicate IN ('SB', 'B', 'C', 'K', 'A', 'B+', 'B-', 'C+', 'C-', NULL)),
    spiritual_description TEXT,
    social_predicate TEXT CHECK (social_predicate IN ('SB', 'B', 'C', 'K', 'A', 'B+', 'B-', 'C+', 'C-', NULL)),
    social_description TEXT,
    notes TEXT,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attitude_records_student ON public.attitude_records(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attitude_records_semester ON public.attitude_records(semester_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attitude_records_user ON public.attitude_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attitude_records_subject ON public.attitude_records(subject) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attitude_records_assessment ON public.attitude_records(assessment_name) WHERE deleted_at IS NULL;

-- Unique constraint: one attitude record per student per subject per assessment per semester
CREATE UNIQUE INDEX IF NOT EXISTS uq_attitude_records ON public.attitude_records(student_id, subject, assessment_name, semester_id) WHERE deleted_at IS NULL;

-- RLS: Enable
ALTER TABLE public.attitude_records ENABLE ROW LEVEL SECURITY;

-- RLS: Teachers can read/write their own records
CREATE POLICY "Teachers can insert their own attitude records"
    ON public.attitude_records
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can read their own attitude records"
    ON public.attitude_records
    FOR SELECT
    USING (auth.uid() = user_id OR 
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('kepala_madrasah', 'waka_kurikulum', 'waka_kesiswaan', 'admin')));

CREATE POLICY "Teachers can update their own attitude records"
    ON public.attitude_records
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leadership can manage all attitude records"
    ON public.attitude_records
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('kepala_madrasah', 'waka_kurikulum', 'admin')));

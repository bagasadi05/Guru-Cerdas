-- Migration: Create BINTANG Tables (Mentoring Logs, Daily Observations, Monthly Evaluations)

-- 1. Bintang Mentoring Logs
CREATE TABLE IF NOT EXISTS public.bintang_mentoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    mentor_role VARCHAR(50) NOT NULL, -- 'WALAS', 'KESISWAAN', 'KEPSEK'
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bintang Daily Observations
CREATE TABLE IF NOT EXISTS public.bintang_daily_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    aspect VARCHAR(50) NOT NULL, -- 'ADAB', 'KEDISIPLINAN', 'KERAPIAN'
    is_positive BOOLEAN NOT NULL DEFAULT false,
    observation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bintang Monthly Evaluations (Rapor)
CREATE TABLE IF NOT EXISTS public.bintang_monthly_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    adab_score VARCHAR(5), -- 'A', 'B', 'C', 'D'
    adab_notes TEXT,
    kedisiplinan_score VARCHAR(5),
    kedisiplinan_notes TEXT,
    kerapian_score VARCHAR(5),
    kerapian_notes TEXT,
    catatan_wali TEXT,
    evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, month)
);

-- Enable RLS
ALTER TABLE public.bintang_mentoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bintang_daily_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bintang_monthly_evaluations ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- Mentoring Logs: Mentors (teachers) can insert and read
CREATE POLICY "Mentors can view mentoring logs" 
    ON public.bintang_mentoring_logs 
    FOR SELECT 
    USING (auth.uid() IN (SELECT id FROM auth.users));

CREATE POLICY "Mentors can insert mentoring logs" 
    ON public.bintang_mentoring_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update own mentoring logs" 
    ON public.bintang_mentoring_logs 
    FOR UPDATE 
    USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can delete own mentoring logs" 
    ON public.bintang_mentoring_logs 
    FOR DELETE 
    USING (auth.uid() = mentor_id);

-- Daily Observations: All teachers can insert, but maybe only Walas/Admin can see all, but for simplicity, let's let all teachers see
CREATE POLICY "Teachers can view daily observations" 
    ON public.bintang_daily_observations 
    FOR SELECT 
    USING (auth.uid() IN (SELECT id FROM auth.users));

CREATE POLICY "Teachers can insert daily observations" 
    ON public.bintang_daily_observations 
    FOR INSERT 
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own daily observations" 
    ON public.bintang_daily_observations 
    FOR UPDATE 
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own daily observations" 
    ON public.bintang_daily_observations 
    FOR DELETE 
    USING (auth.uid() = teacher_id);

-- Monthly Evaluations: 
-- Evaluators can manage them.
-- Parents can read them if published (simplifying: users can read their own child's, or authenticated users can read published ones).
CREATE POLICY "Teachers can manage evaluations"
    ON public.bintang_monthly_evaluations
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM auth.users))
    WITH CHECK (auth.uid() IN (SELECT id FROM auth.users));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_bintang_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bintang_mentoring_logs_updated_at
    BEFORE UPDATE ON public.bintang_mentoring_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_bintang_updated_at_column();

CREATE TRIGGER update_bintang_daily_observations_updated_at
    BEFORE UPDATE ON public.bintang_daily_observations
    FOR EACH ROW
    EXECUTE FUNCTION update_bintang_updated_at_column();

CREATE TRIGGER update_bintang_monthly_evaluations_updated_at
    BEFORE UPDATE ON public.bintang_monthly_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_bintang_updated_at_column();

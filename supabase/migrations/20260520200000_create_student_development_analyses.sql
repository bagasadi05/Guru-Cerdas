-- Create student_development_analyses table
CREATE TABLE IF NOT EXISTS public.student_development_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    analysis_data JSONB NOT NULL,
    generated_by VARCHAR(50) NOT NULL, -- 'AI' or 'Offline Fallback'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.student_development_analyses ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can manage their own student development analyses" ON public.student_development_analyses;

-- Create policy (Only authenticated users/teachers who created the analysis can manage it)
CREATE POLICY "Users can manage their own student development analyses" 
ON public.student_development_analyses 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_student_development_analyses_updated_at ON public.student_development_analyses;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_student_development_analyses_updated_at
BEFORE UPDATE ON public.student_development_analyses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

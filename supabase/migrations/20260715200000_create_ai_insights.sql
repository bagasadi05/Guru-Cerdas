-- Create table for AI Insights caching
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    insight_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index for faster lookups by user and date
CREATE INDEX IF NOT EXISTS ai_insights_user_date_idx ON public.ai_insights(user_id, date);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own insights
CREATE POLICY "Users can view their own insights" 
ON public.ai_insights 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own insights
CREATE POLICY "Users can insert their own insights" 
ON public.ai_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own insights
CREATE POLICY "Users can update their own insights" 
ON public.ai_insights 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own insights
CREATE POLICY "Users can delete their own insights" 
ON public.ai_insights 
FOR DELETE 
USING (auth.uid() = user_id);

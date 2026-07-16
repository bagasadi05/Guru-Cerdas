-- Create table for AI generation queue (Modul Ajar, etc.)
CREATE TABLE IF NOT EXISTS public.ai_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    result_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_generation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can select queue rows to calculate their position and see active jobs
CREATE POLICY "Anyone can view queue" ON public.ai_generation_queue
    FOR SELECT USING (true);

-- Policy: Users can insert their own queue items
CREATE POLICY "Users can insert their own queue items" ON public.ai_generation_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own queue items
CREATE POLICY "Users can update their own queue items" ON public.ai_generation_queue
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own queue items
CREATE POLICY "Users can delete their own queue items" ON public.ai_generation_queue
    FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime for the queue table
alter publication supabase_realtime add table public.ai_generation_queue;

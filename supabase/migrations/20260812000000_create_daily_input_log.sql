-- 20260812000000_create_daily_input_log.sql
-- Tabel untuk mencatat setiap input guru agar bisa diagregasi jadi laporan harian WhatsApp.

CREATE TABLE IF NOT EXISTS public.daily_input_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('quiz', 'subject_grade', 'violation')),
  teacher_name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  class_name TEXT NOT NULL DEFAULT '',
  student_count INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}',
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_input_log ENABLE ROW LEVEL SECURITY;

-- Siapa pun authenticated boleh insert (cek teacher_id = auth.uid())
DROP POLICY IF EXISTS "daily_input_log_insert" ON public.daily_input_log;
CREATE POLICY "daily_input_log_insert" ON public.daily_input_log
  FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

-- Admin bisa baca semua
DROP POLICY IF EXISTS "daily_input_log_admin_read" ON public.daily_input_log;
CREATE POLICY "daily_input_log_admin_read" ON public.daily_input_log
  FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));

-- Guru bisa baca miliknya sendiri
DROP POLICY IF EXISTS "daily_input_log_teacher_read" ON public.daily_input_log;
CREATE POLICY "daily_input_log_teacher_read" ON public.daily_input_log
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_daily_input_log_created_at ON public.daily_input_log(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_input_log_sent ON public.daily_input_log(sent, created_at);

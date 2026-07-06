-- Add 'reminded' column to schedules table for push notification deduplication.
-- The dispatch-push Edge Function sets this to TRUE after sending a reminder
-- so the same schedule slot is not re-notified within the same day.
-- A daily cron job resets it back to FALSE at midnight WIB.

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS reminded boolean DEFAULT false;

-- Index for efficient lookup by the Edge Function
CREATE INDEX IF NOT EXISTS idx_schedules_day_reminded
  ON public.schedules (day, reminded)
  WHERE reminded = false OR reminded IS NULL;

-- Cron job: Reset 'reminded' flag at midnight WIB (17:00 UTC) every day
-- so that recurring weekly schedules can fire reminders again the next week.
-- NOTE: Requires pg_cron extension to be enabled in Supabase Dashboard.
-- Run this manually in SQL Editor if pg_cron is already enabled:
--
-- SELECT cron.schedule(
--   'reset-schedule-reminded',
--   '0 17 * * *',  -- midnight WIB = 17:00 UTC
--   $$UPDATE public.schedules SET reminded = false WHERE reminded = true$$
-- );

-- =============================================================================
-- Migration: secure_dispatch_push_and_pause_ai_worker_cron
-- Tanggal  : 2026-10-04
--
-- 1. Secret internal untuk dispatch-push.
--    Edge function dispatch-push berjalan dengan verify_jwt = false dan
--    sebelumnya tidak punya cek autentikasi apa pun: siapa saja bisa mengirim
--    notifikasi push berisi teks bebas ke orang tua. Function kini mewajibkan
--    header X-Internal-Secret = app_config.dispatch_push_secret (pola yang sama
--    dengan daily-report) atau service role key. Nilai secret dibuat acak di
--    database dan tidak pernah ditulis ke repo.
--
-- 2. invoke_dispatch_push_instant mengirim header tersebut. Definisi lain sama
--    persis dengan versi produksi; CREATE OR REPLACE mempertahankan grant
--    (hanya service_role, lihat 20261003145142).
--
-- 3. Cron modul-ajar-ai-worker-poll DINONAKTIFKAN (bukan dihapus).
--    Sejak 2026-08-17 UI membuat Modul Ajar AI secara langsung (lewat proxy
--    /api/gemini), tidak lagi lewat antrean ai_content_jobs. Worker menolak
--    token cron (401) setiap 2 menit, dan RPC claim/release antreannya sudah
--    tidak ada di produksi. Aktifkan lagi dengan:
--      SELECT cron.alter_job(jobid, active := true) FROM cron.job
--      WHERE jobname = 'modul-ajar-ai-worker-poll';
--
-- Tidak ada data yang dihapus.
-- =============================================================================

INSERT INTO public.app_config (key, value)
SELECT 'dispatch_push_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'dispatch_push_secret');

CREATE OR REPLACE FUNCTION public.invoke_dispatch_push_instant(p_student_id uuid, p_event_type text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  supabase_url text;
  response_id bigint;
  request_body jsonb;
begin
  -- Get Supabase URL from current settings
  supabase_url := current_setting('app.settings.supabase_url', true);

  -- Fallback to default production/staging URL
  if supabase_url is null or supabase_url = '' then
    supabase_url := 'https://fddvcyqbfqydvsfujcxd.supabase.co';
  end if;

  request_body := jsonb_build_object(
    'mode', 'instant',
    'event', p_event_type,
    'student_id', p_student_id,
    'payload', p_payload
  );

  -- Perform asynchronous HTTP POST via pg_net (no wait)
  response_id := net.http_post(
    url := supabase_url || '/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', coalesce(public.get_app_config('dispatch_push_secret'), '')
    ),
    body := request_body
  );
end;
$function$;

SELECT cron.alter_job(jobid, active := false)
FROM cron.job
WHERE jobname = 'modul-ajar-ai-worker-poll';

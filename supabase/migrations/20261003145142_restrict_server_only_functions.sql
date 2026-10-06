-- =============================================================================
-- Migration: restrict_server_only_functions
-- Tanggal  : 2026-10-03
-- Plan     : docs/DB_HARDENING_PLAN_2026-10-03.md — Fase 2
--
-- Fungsi berikut tidak dipanggil dari aplikasi. Pemanggilnya hanya:
--   - trigger SECURITY DEFINER milik postgres (on_*_inserted → invoke_dispatch_push_instant),
--   - set_daily_report_schedule (SECURITY DEFINER milik postgres) → reschedule_daily_report,
--   - job pg_cron yang berjalan sebagai postgres (backup, cleanup log, config worker),
--   - edge function dengan SUPABASE_SERVICE_ROLE_KEY (get_app_config).
-- Pemanggil-pemanggil itu tidak bergantung pada izin anon/authenticated.
--
-- Sebelumnya guru mana pun (bahkan anon) bisa, misalnya, mengirim notifikasi
-- push berisi teks bebas ke orang tua, mengalihkan URL worker AI, atau
-- memunculkan lagi peran yang sudah dicabut admin.
--
-- Rollback: supabase/rollback/2026-10-03_function_acl_snapshot.sql
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.invoke_dispatch_push_instant(uuid, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_modul_ajar_worker_config(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_users_to_roles() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_scheduled_backup() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reschedule_daily_report() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_backup_runs(integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.debug_student_verification(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_daily_input_logs(integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_app_config(text) FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.invoke_dispatch_push_instant(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_modul_ajar_worker_config(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_users_to_roles() TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_scheduled_backup() TO service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_daily_report() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_backup_runs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_student_verification(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_daily_input_logs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_app_config(text) TO service_role;

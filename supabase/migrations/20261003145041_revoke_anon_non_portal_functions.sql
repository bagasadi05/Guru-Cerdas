-- =============================================================================
-- Migration: revoke_anon_non_portal_functions
-- Tanggal  : 2026-10-03
-- Plan     : docs/DB_HARDENING_PLAN_2026-10-03.md — Fase 1
--
-- Masalah: default privileges Supabase memberi EXECUTE langsung ke `anon` untuk
--   setiap fungsi baru di schema public. Migrasi 20260717000000 hanya mencabut
--   dari PUBLIC, jadi fungsi SECURITY DEFINER berikut tetap bisa dipanggil tanpa
--   login (contoh: get_student_directory membocorkan nama semua siswa).
--
-- Tindakan: cabut EXECUTE dari anon dan PUBLIC. `authenticated` tidak diubah,
--   karena fungsi-fungsi ini dipakai guru yang sudah login.
--
-- Tidak disentuh:
--   - RPC Portal Orang Tua (memvalidasi kode akses): get_student_portal_data*,
--     get_student_portal_bintang, verify_access_code, *_parent_message,
--     update_parent_info, subscribe_parent, unsubscribe_parent,
--     get_parent_subscription_status.
--   - Helper RLS (is_admin_user, is_leadership, get_user_role, has_global_access,
--     has_teacher_class_assignment, can_access_student_*): dipakai policy untuk
--     role public; mencabutnya akan membuat query anon error.
--
-- Fungsi trigger tetap berjalan: izin EXECUTE hanya dicek saat CREATE TRIGGER.
-- Rollback: supabase/rollback/2026-10-03_function_acl_snapshot.sql
-- =============================================================================

-- Dipakai aplikasi oleh guru yang sudah login
REVOKE EXECUTE ON FUNCTION public.get_student_directory() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_classes() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_class_analytics_attendance() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_semester(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_fill_weekly_missing_attendance(uuid, date, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_modul_ajar_ai_job(jsonb, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_accessible_communications_read(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_accessible_violation_follow_up(uuid, text, text, boolean, timestamp with time zone) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_extracurricular_attendance(jsonb, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_telegram_config() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_daily_report_schedule(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_app_config(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon, PUBLIC;

-- Fungsi trigger: tidak pernah perlu dipanggil lewat /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_homeroom_on_violation() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_attendance_inserted_or_updated() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_academic_record_inserted() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_announcement_inserted() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.capture_soft_delete() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM anon, PUBLIC;

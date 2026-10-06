-- =============================================================================
-- Migration: pin_function_search_path
-- Tanggal  : 2026-10-03
-- Plan     : docs/DB_HARDENING_PLAN_2026-10-03.md — Fase 4
--
-- Advisor function_search_path_mutable: 24 fungsi tanpa search_path tetap.
-- Untuk fungsi SECURITY DEFINER, search_path yang ikut pemanggil membuka celah
-- pembajakan nama objek lewat schema lain.
--
-- Pra-cek: tidak ada fungsi yang memanggil objek pg_net/vault/cron/ekstensi
-- tanpa nama schema; net.http_post dan auth.users sudah memakai nama schema.
--
-- Rollback: ALTER FUNCTION ... RESET search_path; per fungsi.
-- =============================================================================

ALTER FUNCTION public.activate_semester(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_access_student_grade_record(uuid, uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_access_student_roster(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.capture_soft_delete() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_backup_runs(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_semester_id_for_date(date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_global_access(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.invoke_dispatch_push_instant(uuid, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.invoke_scheduled_backup() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_homeroom_on_violation() SET search_path = public, pg_temp;
ALTER FUNCTION public.on_academic_record_inserted() SET search_path = public, pg_temp;
ALTER FUNCTION public.on_announcement_inserted() SET search_path = public, pg_temp;
ALTER FUNCTION public.on_attendance_inserted_or_updated() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_academic_record_semester_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_attendance_semester_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_modul_ajar_worker_config(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_ph_schedules_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_quiz_point_semester_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_teacher_class_assignments_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_users_to_roles() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_parent_info(uuid, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_extracurricular_attendance(jsonb, uuid) SET search_path = public, pg_temp;

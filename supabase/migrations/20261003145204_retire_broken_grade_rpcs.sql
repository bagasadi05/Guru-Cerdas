-- =============================================================================
-- Migration: retire_broken_grade_rpcs
-- Tanggal  : 2026-10-03
-- Plan     : docs/DB_HARDENING_PLAN_2026-10-03.md — Fase 3
--
-- Ketiga RPC ini tidak dipakai aplikasi dan tidak punya cek otorisasi yang sah:
--   - bulk_insert_grades / update_grade_with_version menulis kolom teacher_id dan
--     updated_at yang tidak ada di academic_records (selalu gagal; 0 dari 2.460
--     baris pernah naik versi). Satu-satunya pemanggil, useGradeManagement, tidak
--     dipakai di mana pun.
--   - apply_quiz_points_to_grade memeriksa kepemilikan memakai user_id_param dari
--     pemanggil (bisa dipalsukan) lalu MENGHAPUS PERMANEN quiz_points.
--
-- Tindakan: cabut EXECUTE dari semua klien. Fungsinya TIDAK dihapus.
-- Rollback: supabase/rollback/2026-10-03_function_acl_snapshot.sql
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.bulk_insert_grades(jsonb, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_grade_with_version(uuid, numeric, text, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_quiz_points_to_grade(uuid, text, uuid) FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.bulk_insert_grades(jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_grade_with_version(uuid, numeric, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_quiz_points_to_grade(uuid, text, uuid) TO service_role;

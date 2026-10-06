-- =============================================================================
-- Migration: index_unindexed_foreign_keys
-- Tanggal  : 2026-10-03
-- Plan     : docs/DB_HARDENING_PLAN_2026-10-03.md — Fase 5
--
-- Advisor unindexed_foreign_keys: 43 foreign key tanpa index pendukung. Tanpa
-- index, join, filter RLS, dan pengecekan FK saat hapus baris induk memindai
-- seluruh tabel. Tabel terbesar (attendance) sekitar 31 ribu baris, jadi
-- CREATE INDEX biasa hanya mengunci sebentar. CONCURRENTLY tidak bisa dipakai
-- di dalam transaksi migrasi.
--
-- Hanya menambah index; tidak mengubah data.
-- Rollback: DROP INDEX IF EXISTS untuk index di file ini saja.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_academic_records_semester_id ON public.academic_records (semester_id);
CREATE INDEX IF NOT EXISTS idx_academic_records_user_id ON public.academic_records (user_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_user_id ON public.academic_years (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_job_requests_job_id ON public.ai_content_job_requests (job_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_jobs_requested_by ON public.ai_content_jobs (requested_by);
CREATE INDEX IF NOT EXISTS idx_ai_generation_attempts_job_id ON public.ai_generation_attempts (job_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_queue_user_id ON public.ai_generation_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_official_by ON public.attendance (official_by);
CREATE INDEX IF NOT EXISTS idx_attendance_semester_id ON public.attendance (semester_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON public.attendance (teacher_id);
CREATE INDEX IF NOT EXISTS idx_communications_student_id ON public.communications (student_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_input_log_teacher_id ON public.daily_input_log (teacher_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_semester_id ON public.extracurricular_attendance (semester_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_attendance_user_id ON public.extracurricular_attendance (user_id);
CREATE INDEX IF NOT EXISTS idx_extracurricular_grades_user_id ON public.extracurricular_grades (user_id);
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON public.homework (class_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework (teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user_id ON public.lesson_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_ph_schedules_created_by ON public.ph_schedules (created_by);
CREATE INDEX IF NOT EXISTS idx_ph_schedules_semester_id ON public.ph_schedules (semester_id);
CREATE INDEX IF NOT EXISTS idx_promes_headers_user_id ON public.promes_headers (user_id);
CREATE INDEX IF NOT EXISTS idx_promes_week_allocations_prota_item_id ON public.promes_week_allocations (prota_item_id);
CREATE INDEX IF NOT EXISTS idx_quiz_points_semester_id ON public.quiz_points (semester_id);
CREATE INDEX IF NOT EXISTS idx_quiz_points_student_id ON public.quiz_points (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_points_user_id ON public.quiz_points (user_id);
CREATE INDEX IF NOT EXISTS idx_ref_bank_tp_iktp_cp_id ON public.ref_bank_tp_iktp (cp_id);
CREATE INDEX IF NOT EXISTS idx_ref_boilerplate_topik_reviewed_by ON public.ref_boilerplate_topik (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_ref_materi_insersi_tema_id ON public.ref_materi_insersi (tema_id);
CREATE INDEX IF NOT EXISTS idx_ref_sintaks_kegiatan_model_id ON public.ref_sintaks_kegiatan (model_id);
CREATE INDEX IF NOT EXISTS idx_semesters_academic_year_id ON public.semesters (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_semesters_user_id ON public.semesters (user_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_semester_id ON public.student_achievements (semester_id);
CREATE INDEX IF NOT EXISTS idx_student_development_analyses_academic_year_id ON public.student_development_analyses (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_development_analyses_semester_id ON public.student_development_analyses (semester_id);
CREATE INDEX IF NOT EXISTS idx_student_development_analyses_student_id ON public.student_development_analyses (student_id);
CREATE INDEX IF NOT EXISTS idx_student_development_analyses_user_id ON public.student_development_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_student_extracurriculars_user_id ON public.student_extracurriculars (user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students (class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_class_id ON public.tasks (class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_violations_semester_id ON public.violations (semester_id);
CREATE INDEX IF NOT EXISTS idx_violations_user_id ON public.violations (user_id);

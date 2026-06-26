-- =============================================================================
-- Fase 1: Leadership read access (RLS)
-- Tanggal: 2026-06-26
-- Tujuan : Memberi akses BACA (SELECT) lintas-guru kepada peran pimpinan
--          (kepala_madrasah, waka_kesiswaan, admin) untuk fungsi pengawasan.
--
-- Sifat  : ADDITIVE & IDEMPOTENT.
--          - Tidak menghapus/mengubah policy pemilik (guru) atau wali kelas.
--          - Semua policy lama PERMISSIVE, sehingga policy leadership ini
--            di-OR -> menambah akses baca, TIDAK mengurangi keamanan tulis.
--          - UPDATE/DELETE/INSERT tetap dibatasi pemilik/admin (tidak disentuh).
--
-- Rekonsiliasi: jika ada migrasi hardening baru bertimestamp lebih besar yang
--          MENGHAPUS policy SELECT tabel di bawah, koordinasikan agar policy
--          leadership_read_* ini tidak ikut terhapus.
-- =============================================================================

-- 1) Helper terpusat: apakah user termasuk pimpinan?
CREATE OR REPLACE FUNCTION public.is_leadership(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'kepala_madrasah', 'waka_kesiswaan')
      and deleted_at is null
  );
$function$;

REVOKE ALL ON FUNCTION public.is_leadership(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;

-- 2) Policy SELECT pimpinan per tabel inti (idempotent: drop-if-exists -> create)

DROP POLICY IF EXISTS "leadership_read_students" ON public.students;
CREATE POLICY "leadership_read_students" ON public.students
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_violations" ON public.violations;
CREATE POLICY "leadership_read_violations" ON public.violations
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_attendance" ON public.attendance;
CREATE POLICY "leadership_read_attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_academic_records" ON public.academic_records;
CREATE POLICY "leadership_read_academic_records" ON public.academic_records
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_quiz_points" ON public.quiz_points;
CREATE POLICY "leadership_read_quiz_points" ON public.quiz_points
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_student_achievements" ON public.student_achievements;
CREATE POLICY "leadership_read_student_achievements" ON public.student_achievements
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_student_development_analyses" ON public.student_development_analyses;
CREATE POLICY "leadership_read_student_development_analyses" ON public.student_development_analyses
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_reports" ON public.reports;
CREATE POLICY "leadership_read_reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_extracurriculars" ON public.extracurriculars;
CREATE POLICY "leadership_read_extracurriculars" ON public.extracurriculars
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_extracurricular_grades" ON public.extracurricular_grades;
CREATE POLICY "leadership_read_extracurricular_grades" ON public.extracurricular_grades
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_extracurricular_attendance" ON public.extracurricular_attendance;
CREATE POLICY "leadership_read_extracurricular_attendance" ON public.extracurricular_attendance
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_student_extracurriculars" ON public.student_extracurriculars;
CREATE POLICY "leadership_read_student_extracurriculars" ON public.student_extracurriculars
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_classes" ON public.classes;
CREATE POLICY "leadership_read_classes" ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_teaching_journals" ON public.teaching_journals;
CREATE POLICY "leadership_read_teaching_journals" ON public.teaching_journals
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "leadership_read_schedules" ON public.schedules;
CREATE POLICY "leadership_read_schedules" ON public.schedules
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

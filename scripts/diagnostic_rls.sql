-- =============================================================================
-- Diagnostic RLS / Policy Checker
-- Jalankan di Supabase SQL Editor untuk mendapatkan laporan status RLS
-- seluruh tabel di database Portal Guru.
--
-- Output terdiri dari 5 bagian:
--   A. Ringkasan: jumlah tabel dengan/ tanpa RLS
--   B. Semua policy RLS aktif, dikelompokkan per tabel (dari pg_policies)
--   C. Tabel yang sudah di-publish di DB tapi belum ada policy sama sekali
--      (risiko: data bisa diakses siapa pun jika public schema)
--   D. Tabel yang TIDAK memiliki RLS (tidak ada ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
--      (risiko: data tidak dilindungi, semua user bisa akses)
--   E. Deteksi anomali: schema drift, constraint, helper fungsi
-- =============================================================================

-- =============================================================================
-- A. RINGKASAN STATISTIK
-- =============================================================================
WITH rls_stats AS (
    SELECT
        COUNT(DISTINCT schemaname || '.' || tablename) AS total_tables_with_policies,
        COUNT(DISTINCT CASE WHEN rls_enabled = 'ON' THEN schemaname || '.' || tablename END) AS total_tables_with_rls,
        COUNT(DISTINCT CASE WHEN rls_enabled = 'OFF' THEN schemaname || '.' || tablename END) AS total_tables_without_rls
    FROM (
        SELECT
            n.nspname AS schemaname,
            c.relname AS tablename,
            CASE WHEN c.relrowsecurity THEN 'ON' ELSE 'OFF' END AS rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'  -- regular tables only
          AND n.nspname IN ('public')
          AND c.relname NOT LIKE 'ref_%'  -- exclude ref tables (reference data)
          AND c.relname NOT LIKE 'ai_%'   -- exclude AI pipeline tables
          AND c.relname NOT IN ('schema_migrations', 'audit_logs', 'rate_limits', 'backup_runs', 'storage_usage_snapshots', 'deletion_audit', 'action_history', 'export_templates')
    ) t
)
SELECT
    'A. RINGKASAN RLS' AS section,
    total_tables_with_policies AS "Tabel dengan policy (di pg_policies)",
    total_tables_with_rls AS "Tabel dengan RLS enabled",
    total_tables_without_rls AS "Tabel TANPA RLS (ANOMALI)"
FROM rls_stats;

-- =============================================================================
-- B. SEMUA POLICY RLS YANG AKTIF
-- =============================================================================
SELECT
    'B. POLICY RLS AKTIF' AS section,
    p.schemaname,
    p.tablename,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd AS operation,
    p.qual AS using_expression,
    p.with_check AS with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename NOT IN ('schema_migrations')
ORDER BY p.tablename, p.cmd, p.policyname;

-- =============================================================================
-- C. TABEL DENGAN RLS ENABLED TAPI TANPA POLICY (RAWBON)
--      -> RLS aktif, tapi tidak ada policy -> SEMUA akses ditolak (default deny)
--      -> Ini bisa jadi bug atau by design (misal: hanya diakses via RPC SECURITY DEFINER)
-- =============================================================================
SELECT
    'C. RLS ENABLED TANPA POLICY' AS section,
    n.nspname AS schemaname,
    c.relname AS tablename,
    'RLS aktif tapi tanpa policy apa pun — hanya bisa diakses via RPC SECURITY DEFINER atau service_role. Pastikan ini memang disengaja.' AS catatan
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = n.nspname AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- =============================================================================
-- D. TABEL DI PUBLIC TANPA RLS (ANOMALI)
--      -> Tidak ada perlindungan sama sekali -> RISIKO TINGGI
--      -> Daftar ini mencakup tabel yang mungkin sengaja tidak di-RLS (ref data)
--         DAN tabel yang lupa di-RLS (anomali)
-- =============================================================================
SELECT
    'D. TABEL TANPA RLS (ANOMALI)' AS section,
    n.nspname AS schemaname,
    c.relname AS tablename,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS estimated_size,
    CASE
        WHEN c.relname LIKE 'ref_%' THEN 'REFERENCE — mungkin sengaja, tapi sebaiknya di-RLS juga (pola: authenticated read + admin manage)'
        WHEN c.relname LIKE 'ai_%' THEN 'AI PIPELINE — periksa apakah akses dari client langsung atau hanya via RPC'
        WHEN c.relname IN ('rate_limits') THEN 'RATE LIMITS — sebaiknya ENABLE RLS + policy insert only via SECURITY DEFINER function'
        WHEN c.relname IN ('backup_runs', 'storage_usage_snapshots') THEN 'SISTEM — periksa jalur akses'
        ELSE 'ANOMALI — tabel ini tidak memiliki RLS!'
    END AS catatan
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = false
  AND c.relname NOT IN ('schema_migrations')
ORDER BY c.relname;

-- =============================================================================
-- E. DETEKSI ANOMALI DRIFT
-- =============================================================================

-- E1. Constraint user_roles.role: apakah sudah sesuai dengan peran yang dipakai aplikasi?
--     Migrasi awal: CHECK (role IN ('admin','teacher','student','parent'))
--     Aplikasi memakai: admin, teacher, guru, wali_kelas, kepala_madrasah, waka_kesiswaan, student, parent
SELECT
    'E1. CONSTRAINT user_roles.role' AS section,
    conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition,
    CASE
        WHEN con.oid IS NULL THEN 'Constraint tidak ditemukan — sudah di-drop manual?'
        WHEN pg_get_constraintdef(con.oid) NOT LIKE '%kepala_madrasah%' THEN 'DRIFT — constraint tidak mencakup role kepala_madrasah dan waka_kesiswaan yang dipakai aplikasi'
        ELSE 'OK'
    END AS status
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'user_roles'
  AND con.contype = 'c'
UNION ALL
SELECT 'E1. CONSTRAINT user_roles.role', NULL, NULL, 'Tidak ada constraint CHECK pada user_roles.role'::text
WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'user_roles' AND con.contype = 'c'
);

-- E2. Kolom is_approved: ada atau tidak?
SELECT
    'E2. Kolom is_approved di user_roles' AS section,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_roles' AND column_name = 'is_approved'
        ) THEN 'ADA — default false, NOT NULL (migrasi 20260713000000)'
        ELSE 'TIDAK ADA — mungkin belum dijalankan?'
    END AS status;

-- E3. Fungsi helper: is_admin_user, is_leadership, can_access_student_grade_record
SELECT
    'E3. Fungsi helper' AS section,
    p.proname AS function_name,
    CASE
        WHEN p.proname IS NULL THEN 'TIDAK ADA — fungsi helper kritis hilang!'
        ELSE 'ADA'
    END AS status,
    pg_get_functiondef(p.oid)::text AS definition_snippet
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin_user', 'is_leadership', 'can_access_student_grade_record', 'can_access_student_roster', 'can_access_student_behavior_record', 'has_teacher_class_assignment')
ORDER BY p.proname;

-- E4. Pastikan policy dari migrasi 20260803000000 sudah ada (jika sudah dijalankan)
--     Jika belum dijalankan, bagian ini akan kosong — itu normal.
SELECT
    'E4. Policy baru (20260803000000)' AS section,
    tablename,
    policyname,
    'SUDAH ADA — migrasi RLS hardening sudah diterapkan' AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
      'Evaluations: evaluator, admin, leadership, or homeroom select',
      'Evaluations: evaluator can insert own',
      'Evaluations: evaluator, admin, or homeroom can update',
      'Evaluations: evaluator, admin, or homeroom can delete',
      'Users update own notifications',
      'Admins can insert announcements',
      'Admins can update announcements',
      'Admins can delete announcements',
      'Admins can view all audit logs',
      'leadership_read_extracurricular_students'
  )
ORDER BY tablename, policyname;

-- E5. Tabel di DB yang TIDAK TERCATAT di migrasi manapun
--     (tabel yang mungkin dibuat manual di SQL Editor tanpa migrasi)
SELECT
    'E5. Tabel publik tanpa migrasi' AS section,
    c.relname AS tablename,
    'Tidak ditemukan di file migrasi mana pun — cek apakah ini tabel legacy atau manual' AS catatan
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relname NOT IN ('schema_migrations')
  AND c.relname NOT LIKE 'ref_%'
  AND c.relname NOT LIKE 'ai_%'
  AND NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      WHERE con.conrelid = c.oid AND con.contype = 'p'
  )
  AND c.relname NOT IN (
      'students', 'classes', 'attendance', 'academic_records', 'violations', 'quiz_points',
      'reports', 'schedules', 'tasks', 'communications', 'homework',
      'user_roles', 'user_settings', 'semesters', 'academic_years',
      'announcements', 'action_history', 'export_templates', 'audit_logs', 'rate_limits',
      'extracurriculars', 'student_extracurriculars', 'extracurricular_attendance',
      'extracurricular_grades', 'extracurricular_students',
      'teacher_class_assignments',
      'student_achievements', 'student_development_analyses',
      'teaching_journals', 'backup_runs', 'deletion_audit',
      'attendance_archive', 'storage_usage_snapshots',
      'bintang_mentoring_logs', 'bintang_daily_observations', 'bintang_monthly_evaluations',
      'ai_insights', 'ai_generation_queue', 'internal_notifications',
      'push_subscriptions', 'lesson_plans', 'school_info',
      'ref_sintaks_kegiatan', 'ref_boilerplate_topik', 'ref_rubrik_template',
      'ref_tema_kbc', 'ref_materi_insersi', 'ref_bank_tp_iktp',
      'ref_capaian_pembelajaran', 'ref_model_pembelajaran', 'ref_subject_alias',
      'ai_content_jobs', 'ai_generation_attempts', 'ai_content_job_requests'
  );
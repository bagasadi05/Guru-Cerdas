-- F17-2: Akses Kolaboratif untuk Point Pelanggaran
-- Tujuan: SEMUA guru (user terautentikasi) bisa MELIHAT & MENAMBAH pelanggaran SEMUA siswa.
--         UPDATE/DELETE tetap dibatasi ke pencatat (auth.uid() = user_id) ATAU Admin.
-- Data lain (nilai/profil lengkap) TIDAK terpengaruh — hanya tabel violations yang dibuka.
-- Idempotent: aman dijalankan ulang.
--
-- CATATAN REKONSILIASI (urutan merge):
--   Migrasi ini SENGAJA MEMBUKA RLS `violations`, berlawanan dengan hardening.
--   Policy ketat `violations` dari 20260416120000_harden_core_teacher_rls.sql
--   (dan kemungkinan branch f16-3 / 20260624180000_harden_multi_user_rls.sql)
--   di-DROP IF EXISTS dulu. Timestamp migrasi ini (20260625150000) sengaja lebih
--   baru agar tidak tertimpa hardening lama. Jika branch f16-3 di-merge SETELAH
--   ini dengan timestamp lebih baru yang memperketat `violations`, koordinasikan
--   agar policy kolaboratif di bawah tidak ter-override.

-- 1) Pastikan RLS aktif
ALTER TABLE IF EXISTS public.violations ENABLE ROW LEVEL SECURITY;

-- 2) Hapus policy ketat lama untuk violations (default dari harden_core & kemungkinan f16-3)
DROP POLICY IF EXISTS "Authenticated users can view own rows" ON public.violations;
DROP POLICY IF EXISTS "Authenticated users can insert own rows" ON public.violations;
DROP POLICY IF EXISTS "Authenticated users can update own rows" ON public.violations;
DROP POLICY IF EXISTS "Authenticated users can delete own rows" ON public.violations;
-- Defensif: nama policy alternatif yang mungkin dibuat branch hardening lain
DROP POLICY IF EXISTS "violations_select_own" ON public.violations;
DROP POLICY IF EXISTS "violations_insert_own" ON public.violations;
DROP POLICY IF EXISTS "violations_update_own" ON public.violations;
DROP POLICY IF EXISTS "violations_delete_own" ON public.violations;

-- 3) Hapus policy kolaboratif (jika sudah ada dari run sebelumnya) agar idempotent
DROP POLICY IF EXISTS "Violations: all teachers can select" ON public.violations;
DROP POLICY IF EXISTS "Violations: all teachers can insert" ON public.violations;
DROP POLICY IF EXISTS "Violations: creator or admin can update" ON public.violations;
DROP POLICY IF EXISTS "Violations: creator or admin can delete" ON public.violations;

-- 4) Policy kolaboratif baru
-- SELECT: semua user terautentikasi
CREATE POLICY "Violations: all teachers can select"
    ON public.violations
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: semua user terautentikasi, tetapi WAJIB mencatat dirinya sendiri (akuntabilitas)
CREATE POLICY "Violations: all teachers can insert"
    ON public.violations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: hanya pencatat ATAU admin
CREATE POLICY "Violations: creator or admin can update"
    ON public.violations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
    WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- DELETE: hanya pencatat ATAU admin
CREATE POLICY "Violations: creator or admin can delete"
    ON public.violations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 5) RPC SECURITY DEFINER: direktori siswa minimal (id, nama, nama kelas)
--    HANYA mengembalikan data minimal untuk UI pemilihan siswa pada pencatatan
--    pelanggaran. TIDAK mengekspos nilai/profil/data sensitif lain.
CREATE OR REPLACE FUNCTION public.get_student_directory()
RETURNS TABLE (
    id uuid,
    name text,
    class_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        s.id,
        s.name,
        COALESCE(c.name, s.class) AS class_name
    FROM public.students s
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE s.deleted_at IS NULL
    ORDER BY class_name NULLS LAST, s.name;
$$;

-- Hanya user terautentikasi yang boleh memanggil
REVOKE ALL ON FUNCTION public.get_student_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_directory() TO authenticated;

COMMENT ON FUNCTION public.get_student_directory() IS
    'Direktori siswa minimal (id, nama, nama kelas) untuk pencatatan pelanggaran kolaboratif. Tidak mengekspos nilai/profil sensitif.';

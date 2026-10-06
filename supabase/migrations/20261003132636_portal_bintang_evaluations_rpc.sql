-- =============================================================================
-- Migration: 20261003132636_portal_bintang_evaluations_rpc
-- Tanggal  : 2026-10-03
-- Tujuan   : Menampilkan rapor BINTANG terbit di Portal Orang Tua.
--
-- Masalah: Portal masuk memakai kode akses tanpa sesi Supabase (role anon),
--   sedangkan semua policy bintang_monthly_evaluations hanya TO authenticated
--   dan RPC get_student_portal_data tidak memuat data bintang. Query langsung
--   dari portal selalu mengembalikan array kosong.
--
-- Solusi: RPC SECURITY DEFINER yang memvalidasi pasangan student_id +
--   access_code (pola yang sama dengan get_student_portal_data) dan hanya
--   mengembalikan rapor yang sudah dipublikasikan. Tabel tetap tertutup untuk anon.
--
-- Sifat: IDEMPOTENT.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_student_portal_bintang(
    student_id_param uuid,
    access_code_param text
)
RETURNS TABLE (
    id uuid,
    student_id uuid,
    month character varying,
    adab_score character varying,
    adab_notes text,
    kedisiplinan_score character varying,
    kedisiplinan_notes text,
    kerapian_score character varying,
    kerapian_notes text,
    catatan_wali text,
    is_published boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF access_code_param IS NULL OR btrim(access_code_param) = '' THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = student_id_param
          AND s.access_code = access_code_param
          AND s.deleted_at IS NULL
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.student_id,
        e.month,
        e.adab_score,
        e.adab_notes,
        e.kedisiplinan_score,
        e.kedisiplinan_notes,
        e.kerapian_score,
        e.kerapian_notes,
        e.catatan_wali,
        e.is_published,
        e.created_at,
        e.updated_at
    FROM public.bintang_monthly_evaluations e
    WHERE e.student_id = student_id_param
      AND e.is_published = true
    ORDER BY e.month DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_portal_bintang(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_bintang(uuid, text) TO anon, authenticated;

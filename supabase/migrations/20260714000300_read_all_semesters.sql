-- Migration: Allow all authenticated users to read semesters and academic years
-- Tujuan: Agar semua guru (bukan cuma admin) bisa melihat daftar semester
-- dan mengetahui semester mana yang sedang aktif saat ini.

-- 1. Perbaiki RLS untuk tabel semesters
DROP POLICY IF EXISTS "Users can view own semesters" ON public.semesters;
DROP POLICY IF EXISTS "Leadership can view all semesters" ON public.semesters;

CREATE POLICY "Authenticated users can view semesters"
    ON public.semesters
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Perbaiki RLS untuk tabel academic_years
DROP POLICY IF EXISTS "Users can view own academic years" ON public.academic_years;

CREATE POLICY "Authenticated users can view academic years"
    ON public.academic_years
    FOR SELECT
    TO authenticated
    USING (true);

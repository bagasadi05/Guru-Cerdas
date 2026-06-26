-- =============================================================================
-- F18-5 fix: Leadership read access untuk tabel semesters
-- Masalah: RLS semesters hanya (auth.uid() = user_id) untuk SELECT, sehingga
-- kepala madrasah / waka kesiswaan tidak bisa membaca semester aktif (milik
-- admin). Akibatnya SemesterContext.activeSemester = null untuk pimpinan,
-- dan seluruh analytics tidak ter-scope ke semester aktif.
-- Solusi: tambahkan policy SELECT untuk leadership (konsisten pola Fase 1),
-- memakai helper public.is_leadership(uuid). Idempoten & additive.
-- =============================================================================

DROP POLICY IF EXISTS "Leadership can view all semesters" ON public.semesters;
CREATE POLICY "Leadership can view all semesters"
ON public.semesters
FOR SELECT
TO authenticated
USING (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "Leadership can view all academic_years" ON public.academic_years;
CREATE POLICY "Leadership can view all academic_years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (public.is_leadership(auth.uid()));

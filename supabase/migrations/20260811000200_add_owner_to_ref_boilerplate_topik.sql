-- 20260811000200_add_owner_to_ref_boilerplate_topik.sql
--
-- B12: Policy UPDATE draft ref_boilerplate_topik saat ini tanpa ownership —
-- siapa pun authenticated (termasuk siswa/orang tua) bisa menimpa draft_ai/
-- draft_manual milik siapa pun. Perbaikan:
--   1. Tambah kolom owner_id (nullable — baris lama tidak punya pemilik jelas).
--   2. Backfill owner_id untuk baris draft_ai dari ai_content_jobs.requested_by
--      (pemilik job yang menghasilkan konten).
--   3. Policy INSERT: izinkan semua authenticated, tapi paksa owner_id = auth.uid()
--      (via DEFAULT auth.uid()).
--   4. Policy UPDATE: hanya owner atau admin.
--
-- Sifat: IDEMPOTENT (IF NOT EXISTS / DROP IF EXISTS).

-- =========================================
-- 1. Kolom owner_id
-- =========================================
ALTER TABLE public.ref_boilerplate_topik
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Default untuk insert baru: pemilik = user yang login.
ALTER TABLE public.ref_boilerplate_topik
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- =========================================
-- 2. Backfill owner_id dari ai_content_jobs (draft_ai hasil job AI)
-- =========================================
UPDATE public.ref_boilerplate_topik b
SET owner_id = j.requested_by
FROM ai_content_jobs j
WHERE b.owner_id IS NULL
  AND b.content_status IN ('draft_ai', 'draft_manual')
  AND b.request_fingerprint IS NOT NULL
  AND j.request_fingerprint = b.request_fingerprint;

-- =========================================
-- 3. Policy — hapus yang lama, buat yang baru
-- =========================================
ALTER TABLE public.ref_boilerplate_topik ENABLE ROW LEVEL SECURITY;

-- INSERT: siapa pun authenticated boleh menambahkan draft, owner otomatis auth.uid()
DROP POLICY IF EXISTS "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik
  FOR INSERT TO authenticated
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

-- UPDATE: hanya owner (auth.uid() = owner_id) ATAU admin yang boleh mengubah draft
DROP POLICY IF EXISTS "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik
  FOR UPDATE TO authenticated
  USING (
    content_status IN ('draft_ai', 'draft_manual')
    AND (owner_id IS NULL OR owner_id = auth.uid() OR public.is_admin_user(auth.uid()))
  )
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

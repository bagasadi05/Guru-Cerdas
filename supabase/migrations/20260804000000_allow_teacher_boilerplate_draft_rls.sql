-- Migration: 20260804000000_allow_teacher_boilerplate_draft_rls.sql
--
-- Latar belakang:
-- RLS ref_boilerplate_topik sebelumnya hanya mengizinkan authenticated SELECT
-- dan admin FOR ALL. Akibatnya, cache AI per-field (cacheToBank) dan cache AI
-- full (cacheToDatabase) yang dijalankan dari sisi browser guru selalu gagal
-- diam-diam (RLS block), sehingga Bank Bersama tidak pernah terisi dari hasil
-- AI guru.
--
-- Perbaikan:
--  1. Izinkan authenticated INSERT/UPDATE baris dengan content_status
--     'draft_ai' / 'draft_manual' (draf yang menunggu review admin).
--  2. Verified tetap hanya bisa dibuat/diubah oleh admin (policy "Admins manage
--     ref_boilerplate_topik") — guru tidak bisa mem-publish konten sendiri.
--
-- Sifat: IDEMPOTENT (DROP IF EXISTS + CREATE POLICY).

ALTER TABLE public.ref_boilerplate_topik ENABLE ROW LEVEL SECURITY;

-- INSERT draf oleh siapa pun yang terautentikasi (guru menambahkan kandidat
-- konten ke Bank Bersama untuk direview admin).
DROP POLICY IF EXISTS "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik
  FOR INSERT TO authenticated
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

-- UPDATE draf oleh siapa pun yang terautentikasi (mis. melanjutkan melengkapi
-- konten AI per-field). Dilarang menyentuh baris verified/rejected/deprecated.
DROP POLICY IF EXISTS "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik
  FOR UPDATE TO authenticated
  USING (content_status IN ('draft_ai', 'draft_manual'))
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

-- 20260811000100_fix_modul_ajar_remaining_drift.sql
--
-- Remediasi drift sisa dari rangkaian migrasi Juli-Agustus 2026.
-- Migrasi 20260722150000 menambahkan kolom elemen/sumber_regulasi/tahun/is_verified
-- ke ref_capaian_pembelajaran, tapi hanya sebagian yang benar-benar ter-apply di live.
-- Terverifikasi: `elemen` ada, `sumber_regulasi` TIDAK ada (hanya ada di ref_boilerplate_topik).
--
-- Sifat: IDEMPOTENT (IF NOT EXISTS).

-- =========================================
-- 1. ref_capaian_pembelajaran.sumber_regulasi
-- =========================================
ALTER TABLE public.ref_capaian_pembelajaran
  ADD COLUMN IF NOT EXISTS sumber_regulasi text,
  ADD COLUMN IF NOT EXISTS tahun integer,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true;

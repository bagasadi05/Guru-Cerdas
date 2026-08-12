-- 20260812000006_add_missing_modul_ajar_columns.sql
--
-- Kolom yang didefinisikan di migration 20260722150000_modul_ajar_database_driven
-- tapi TIDAK pernah diterima database staging: isi file migration diedit
-- setelah versi awalnya ter-deploy, sehingga statement ALTER (ref_model_pembelajaran)
-- dan kolom tujuan/updated_at (ref_tema_kbc) tidak pernah dieksekusi di DB.
-- Ditambahkan di sini agar DB existing menyamai DB fresh — idempotent, no-op
-- di database yang kolomnya sudah ada.

-- ref_model_pembelajaran (ALTER di 20260722150000 bagian 6)
ALTER TABLE public.ref_model_pembelajaran
  ADD COLUMN IF NOT EXISTS kategori text,
  ADD COLUMN IF NOT EXISTS sumber text,
  ADD COLUMN IF NOT EXISTS cocok_untuk jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kelebihan jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kekurangan jsonb DEFAULT '[]'::jsonb;

-- ref_tema_kbc (CREATE di 20260722150000 memuat tujuan + updated_at)
ALTER TABLE public.ref_tema_kbc
  ADD COLUMN IF NOT EXISTS tujuan text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Backfill tujuan dari deskripsi (pola seed 20260722150100: tujuan = deskripsi)
UPDATE public.ref_tema_kbc
SET tujuan = deskripsi
WHERE tujuan IS NULL;

-- Kunci NOT NULL sesuai definisi CREATE TABLE di 20260722150000
ALTER TABLE public.ref_tema_kbc
  ALTER COLUMN tujuan SET NOT NULL;

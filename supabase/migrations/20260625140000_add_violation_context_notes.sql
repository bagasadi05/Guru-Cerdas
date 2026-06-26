-- F17-1: Keterangan/konteks bebas pada Point Pelanggaran
-- Menambahkan kolom `context_notes` ke tabel violations.
-- Berbeda dari `description` (jenis pelanggaran) dan `follow_up_notes` (tindak lanjut).
-- Idempotent: aman dijalankan ulang.

ALTER TABLE public.violations
    ADD COLUMN IF NOT EXISTS context_notes text;

COMMENT ON COLUMN public.violations.context_notes IS
    'Keterangan/konteks bebas yang ditulis guru saat mencatat pelanggaran (opsional).';

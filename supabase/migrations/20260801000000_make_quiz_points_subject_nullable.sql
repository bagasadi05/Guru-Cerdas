-- Migration: Make quiz_points.subject nullable
-- Alasan: Kolom subject di tabel quiz_points digunakan untuk dua tujuan:
-- 1. Poin akademik per-mapel (dari menu penilaian) → subject terisi
-- 2. Poin keaktifan BINTANG (dari dashboard Bintang) → subject tidak relevan
--
-- Dengan membuat subject nullable, entry dari BINTANG bisa mengirim NULL
-- sementara entry dari menu penilaian tetap bisa mengisi subject seperti biasa.

ALTER TABLE quiz_points ALTER COLUMN subject DROP NOT NULL;

COMMENT ON COLUMN quiz_points.subject IS 'Mata pelajaran (nullable — NULL berarti poin keaktifan umum BINTANG, bukan akademik per-mapel)';

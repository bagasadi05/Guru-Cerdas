-- 20260811000001_remediate_quiz_points_subject_nullable.sql
--
-- Remediasi drift antara migrasi lokal dan live DB.
-- Latar belakang: 20260801000000_make_quiz_points_subject_nullable.sql tercatat
-- "applied" di supabase_migrations.schema_migrations tetapi kolom quiz_points.subject
-- masih NOT NULL di DB live. Akibatnya insert "Poin Keaktifan" BINTANG (subject = NULL)
-- gagal dengan constraint violation di production.
--
-- Sifat: IDEMPOTENT — aman dijalankan ulang.

-- Cek dulu constraint saat ini, lalu drop NOT NULL kalau masih ada.
ALTER TABLE public.quiz_points ALTER COLUMN subject DROP NOT NULL;

COMMENT ON COLUMN public.quiz_points.subject IS 'Mata pelajaran (nullable — NULL berarti poin keaktifan umum BINTANG, bukan akademik per-mapel)';

-- 20260811000000_remediate_missing_modul_ajar_objects.sql
--
-- Remediasi drift antara migrasi lokal dan live DB.
-- Latar belakang: beberapa objek dari rangkaian migrasi Juli-Agustus 2026
-- tercatat "applied" di remote (supabase_migrations.schema_migrations) tetapi
-- tidak pernah benar-benar dibuat di DB live:
--   * public.ref_rubrik_template  -> 404 (query Modul Ajar)
--   * public.ref_bank_tp_iktp     -> 404 (query Bank TP/IKTP)
--   * lesson_plans.generation_method -> 400 (kolom tidak ada, di-insert app)
--   * Policy INSERT/UPDATE draft ref_boilerplate_topik -> 400 (cache AI guru)
--
-- Sifat: IDEMPOTENT (IF NOT EXISTS / DROP IF EXISTS), aman dijalankan ulang.

-- =========================================
-- 1. ref_rubrik_template (hilang di live)
-- =========================================
CREATE TABLE IF NOT EXISTS public.ref_rubrik_template (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kategori text NOT NULL,
  kriteria text NOT NULL,
  sangat_baik text NOT NULL,
  baik text NOT NULL,
  cukup text NOT NULL,
  perlu_bimbingan text NOT NULL,
  urutan integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(kategori, kriteria)
);

ALTER TABLE public.ref_rubrik_template ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read ref_rubrik_template" ON public.ref_rubrik_template;
CREATE POLICY "Authenticated read ref_rubrik_template" ON public.ref_rubrik_template
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins manage ref_rubrik_template" ON public.ref_rubrik_template;
CREATE POLICY "Admins manage ref_rubrik_template" ON public.ref_rubrik_template
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Seed rubrik (dari 20260722150100) — idempotent via ON CONFLICT
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES
  ('diskusi', 'Keaktifan Diskusi',
   'Siswa aktif memberikan ide secara konsisten dan memimpin jalannya diskusi.',
   'Siswa aktif memberikan ide beberapa kali selama diskusi.',
   'Siswa sesekali memberikan pendapat jika ditanya.',
   'Siswa pasif dan tidak memberikan pendapat sama sekali.', 1),
  ('diskusi', 'Kerjasama Kelompok',
   'Sangat kooperatif, membantu teman kelompok, dan berbagi tugas dengan adil.',
   'Kooperatif dan melaksanakan tugas kelompok yang diberikan.',
   'Hanya mau bekerjasama setelah mendapat dorongan guru.',
   'Tidak mau bekerjasama dan mengganggu konsentrasi kelompok.', 2),
  ('diskusi', 'Menghargai Pendapat',
   'Mendengarkan dengan penuh hormat dan menanggapi ide teman dengan bahasa yang sangat sopan.',
   'Mendengarkan pendapat teman dan tidak memotong pembicaraan.',
   'Sesekali memotong pembicaraan atau kurang menghormati pendapat teman.',
   'Sama sekali tidak menghargai pendapat orang lain.', 3),
  ('presentasi', 'Penguasaan Materi',
   'Menjelaskan konsep secara mendalam tanpa melihat catatan dan menjawab pertanyaan dengan tepat.',
   'Menjelaskan konsep dengan baik tetapi sesekali melihat catatan.',
   'Membaca sebagian besar slide/catatan saat menjelaskan materi.',
   'Tidak memahami materi dan hanya membaca slide tanpa penjelasan.', 1),
  ('presentasi', 'Kemampuan Berbicara',
   'Suara terdengar jelas di seluruh kelas, intonasi menarik, dan sangat percaya diri.',
   'Suara jelas tetapi intonasi agak monoton.',
   'Suara lirih dan kurang terdengar jelas di bagian belakang kelas.',
   'Bergumam, tidak terdengar, dan terlihat sangat cemas.', 2),
  ('presentasi', 'Sikap Kerja',
   'Kontak mata konsisten dengan audiens, gestur tubuh natural, dan sopan.',
   'Ada kontak mata sesekali, berdiri dengan tegak dan sopan.',
   'Kurang kontak mata dan berdiri kurang tegap.',
   'Membelakangi audiens sepanjang presentasi.', 3),
  ('sikap', 'Kemandirian Belajar',
   'Memulai tugas sendiri tanpa diperintah, fokus penuh, dan menyelesaikan tepat waktu.',
   'Mengerjakan tugas dengan tertib dan selesai tepat waktu.',
   'Membutuhkan dorongan guru beberapa kali untuk menyelesaikan tugas.',
   'Tidak menyelesaikan tugas meskipun sudah dibimbing guru.', 1),
  ('sikap', 'Bernalar Kritis',
   'Sering bertanya kritis, menganalisis masalah secara mandiri, dan memberi argumen logis.',
   'Menjawab pertanyaan guru dengan penjelasan logis.',
   'Hanya menjawab secara singkat tanpa disertai alasan.',
   'Belum mampu memberikan tanggapan atau alasan logis.', 2)
ON CONFLICT (kategori, kriteria) DO NOTHING;

-- =========================================
-- 2. ref_bank_tp_iktp (hilang di live)
-- =========================================
CREATE TABLE IF NOT EXISTS public.ref_bank_tp_iktp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cp_id uuid REFERENCES public.ref_capaian_pembelajaran(id) ON DELETE CASCADE,
  tujuan_pembelajaran text NOT NULL,
  iktp jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_bank_tp_iktp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read ref_bank_tp_iktp" ON public.ref_bank_tp_iktp;
CREATE POLICY "Authenticated read ref_bank_tp_iktp" ON public.ref_bank_tp_iktp
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins manage ref_bank_tp_iktp" ON public.ref_bank_tp_iktp;
CREATE POLICY "Admins manage ref_bank_tp_iktp" ON public.ref_bank_tp_iktp
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- =========================================
-- 3. lesson_plans.generation_method (kolom hilang di live)
--    Sumber: 20260722170000
-- =========================================
ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS generation_method text DEFAULT 'Manual';

-- =========================================
-- 4. Policy INSERT/UPDATE draft ref_boilerplate_topik
--    Sumber: 20260804000000 — cache AI guru ke Bank Bersama
-- =========================================
ALTER TABLE public.ref_boilerplate_topik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated insert boilerplate drafts" ON public.ref_boilerplate_topik
  FOR INSERT TO authenticated
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

DROP POLICY IF EXISTS "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik;
CREATE POLICY "Authenticated update boilerplate drafts" ON public.ref_boilerplate_topik
  FOR UPDATE TO authenticated
  USING (content_status IN ('draft_ai', 'draft_manual'))
  WITH CHECK (content_status IN ('draft_ai', 'draft_manual'));

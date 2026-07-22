-- 20260722150000_modul_ajar_database_driven.sql
-- Fase 1: Migrasi Database (tabel referensi baru) untuk Modul Ajar

-- 1. ref_sintaks_kegiatan
CREATE TABLE public.ref_sintaks_kegiatan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid REFERENCES public.ref_model_pembelajaran(id) ON DELETE CASCADE,
  urutan integer NOT NULL,
  nama_langkah text NOT NULL,
  kegiatan_guru text NOT NULL,
  kegiatan_siswa text NOT NULL,
  estimasi_menit_persen integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_sintaks_kegiatan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_sintaks_kegiatan" ON public.ref_sintaks_kegiatan
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_sintaks_kegiatan" ON public.ref_sintaks_kegiatan
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- 2. ref_boilerplate_topik
CREATE TABLE public.ref_boilerplate_topik (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mata_pelajaran text NOT NULL,
  topik text NOT NULL,
  fase text,
  tujuan_pembelajaran jsonb NOT NULL DEFAULT '[]'::jsonb,
  pemahaman_bermakna jsonb NOT NULL DEFAULT '[]'::jsonb,
  pertanyaan_pemantik jsonb NOT NULL DEFAULT '[]'::jsonb,
  lkpd_tugas text NOT NULL,
  soal_evaluasi text NOT NULL,
  pengayaan jsonb NOT NULL DEFAULT '[]'::jsonb,
  remedial jsonb NOT NULL DEFAULT '[]'::jsonb,
  daftar_pustaka jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  sumber_regulasi text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(mata_pelajaran, topik, fase)
);

ALTER TABLE public.ref_boilerplate_topik ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_boilerplate_topik" ON public.ref_boilerplate_topik
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_boilerplate_topik" ON public.ref_boilerplate_topik
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- 3. ref_rubrik_template
CREATE TABLE public.ref_rubrik_template (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kategori text NOT NULL,
  kriteria text NOT NULL,
  sangat_baik text NOT NULL,
  baik text NOT NULL,
  cukup text NOT NULL,
  perlu_bimbingan text NOT NULL,
  urutan integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_rubrik_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_rubrik_template" ON public.ref_rubrik_template
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_rubrik_template" ON public.ref_rubrik_template
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- 4. ref_tema_kbc & ref_materi_insersi
CREATE TABLE public.ref_tema_kbc (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_tema text NOT NULL,
  deskripsi text NOT NULL,
  tujuan text NOT NULL,
  urutan integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_tema_kbc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_tema_kbc" ON public.ref_tema_kbc
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_tema_kbc" ON public.ref_tema_kbc
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE public.ref_materi_insersi (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tema_id uuid REFERENCES public.ref_tema_kbc(id) ON DELETE CASCADE,
  konten text NOT NULL,
  konteks_penggunaan text NOT NULL,
  frasa_tp text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_materi_insersi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_materi_insersi" ON public.ref_materi_insersi
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_materi_insersi" ON public.ref_materi_insersi
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- 5. ref_bank_tp_iktp
CREATE TABLE public.ref_bank_tp_iktp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cp_id uuid REFERENCES public.ref_capaian_pembelajaran(id) ON DELETE CASCADE,
  tujuan_pembelajaran text NOT NULL,
  iktp jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ref_bank_tp_iktp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_bank_tp_iktp" ON public.ref_bank_tp_iktp
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage ref_bank_tp_iktp" ON public.ref_bank_tp_iktp
  FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- 6. Perluasan tabel yang sudah ada
ALTER TABLE public.ref_capaian_pembelajaran
ADD COLUMN IF NOT EXISTS elemen text,
ADD COLUMN IF NOT EXISTS sumber_regulasi text,
ADD COLUMN IF NOT EXISTS tahun integer,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true;

ALTER TABLE public.ref_model_pembelajaran
ADD COLUMN IF NOT EXISTS kategori text,
ADD COLUMN IF NOT EXISTS sumber text,
ADD COLUMN IF NOT EXISTS cocok_untuk jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS kelebihan jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS kekurangan jsonb DEFAULT '[]'::jsonb;

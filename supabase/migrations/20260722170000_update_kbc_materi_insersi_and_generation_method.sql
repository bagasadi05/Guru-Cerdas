-- 20260722170000_update_kbc_materi_insersi_and_generation_method.sql
-- P1-3: Tambah kolom generation_method di lesson_plans & variasikan konteks_penggunaan di ref_materi_insersi

ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS generation_method text DEFAULT 'Manual';

-- Perbarui / Seeding variatif ref_materi_insersi
DELETE FROM public.ref_materi_insersi;

-- Tema 1: cinta_allah_rasul
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES
  ('m1-1', 'cinta_allah_rasul', 'Internalisasi Asmaul Husna (Ar-Rahman, Ar-Rahim, Al-Latif) dalam pembelajaran', 'pendahuluan', 'dengan meneladani sifat Ar-Rahman & Ar-Rahim Allah Swt.'),
  ('m1-2', 'cinta_allah_rasul', 'Ibadah sebagai wujud rasa syukur dan cinta kepada Allah Swt.', 'inti', 'sebagai wujud rasa syukur dan mahabbah kepada Allah Swt.'),
  ('m1-3', 'cinta_allah_rasul', 'Meneladani sifat kasih sayang dan akhlak Sirah Nabawiyah Rasulullah', 'refleksi', 'berlandaskan meneladani akhlak mulia Rasulullah Saw.');

-- Tema 2: cinta_ilmu
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES
  ('m2-1', 'cinta_ilmu', 'Adab menuntut ilmu (tawakal, tekun, yakin, dan syukur)', 'pendahuluan', 'dengan mengamalkan adab menuntut ilmu dan rasa cinta ilmu.'),
  ('m2-2', 'cinta_ilmu', 'Penalaran kritis dan literasi sebagai wujud adab intelektual', 'inti', 'melalui penalaran kritis sebagai wujud kecintaan pada ilmu pengetahuan.'),
  ('m2-3', 'cinta_ilmu', 'Hormat dan tawadhu kepada guru serta sumber ilmu', 'refleksi', 'dengan sikap tawadhu dan hormat kepada pembawa ilmu.');

-- Tema 3: cinta_lingkungan
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES
  ('m3-1', 'cinta_lingkungan', 'Prinsip Rahmatan lil \'alamin dan kepedulian terhadap ekosistem', 'inti', 'sebagai wujud kepedulian lingkungan dan Rahmatan lil \'alamin.'),
  ('m3-2', 'cinta_lingkungan', 'Larangan berbuat fasad (merusak alam) - QS. Ar-Rum: 41', 'pendahuluan', 'dengan menjaga kelestarian alam dan menjauhi kerusakan.'),
  ('m3-3', 'cinta_lingkungan', 'Hemat energi dan sumber daya air (larangan ishraf)', 'penutup', 'dengan menerapkan perilaku hemat energi dan bijak menjaga alam.');

-- Tema 4: cinta_diri_sesama
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES
  ('m4-1', 'cinta_diri_sesama', 'Self-compassion, kesadaran emosional, dan resiliensi diri', 'pendahuluan', 'dengan membangun kesadaran diri dan rasa cinta sesama.'),
  ('m4-2', 'cinta_diri_sesama', 'Ukhuwah Islamiyah, Ukhuwah Insaniyah, dan empati sosial', 'inti', 'berlandaskan prinsip ukhuwah dan empati terhadap sesama.'),
  ('m4-3', 'cinta_diri_sesama', 'Budaya tasamuh (toleransi) dan syura (musyawarah)', 'penutup', 'melalui budaya tasamuh, toleransi, dan musyawarah yang santun.');

-- Tema 5: cinta_tanah_air
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES
  ('m5-1', 'cinta_tanah_air', 'Prinsip Hubbul Wathan minal Iman (Cinta Tanah Air bagian dari Iman)', 'pendahuluan', 'dengan menanamkan jiwa Hubbul Wathan minal Iman.'),
  ('m5-2', 'cinta_tanah_air', 'Ukhuwah Wathaniyah dan persatuan dalam keberagaman (QS. Al-Hujurat: 13)', 'inti', 'dalam bingkai ukhuwah wathaniyah dan persatuan keberagaman.'),
  ('m5-3', 'cinta_tanah_air', 'Menghormati simbol negara dan budaya luhur bangsa', 'refleksi', 'sebagai wujud penghormatan terhadap tanah air dan bangsa.');

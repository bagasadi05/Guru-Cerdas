-- 20260815000002_seed_sintaks_kegiatan_live.sql
--
-- Backfill ref_sintaks_kegiatan untuk model yang ADA di live DB.
--
-- Latar belakang: 20260722160000_fix_sintaks_kegiatan_content.sql menjalankan
-- DELETE + INSERT ... SELECT id FROM ref_model_pembelajaran WHERE nama_model =
-- 'Problem-Based Learning (PBL)' dst. Di live DB, nama model adalah
-- 'Problem Based Learning (PBL)' (tanpa tanda hubung) dan 'Project Based
-- Learning (PjBL)' (tanpa "Standar"), sehingga SELECT tidak mencocokkan
-- apa pun dan tabel tetap kosong. Akibatnya GET ref_sintaks_kegiatan
-- mengembalikan [] dan UI jatuh ke fallback generik.
--
-- Migration ini men-seed ulang dengan mencocokkan nama_model ASLI di DB
-- (yang paling robust terhadap perbedaan UUID antar environment).
--
-- Sifat: IDEMPOTENT — setiap baris hanya di-insert jika belum ada
-- (model_id + urutan belum terisi), aman dijalankan ulang.
-- =========================================================================

-- =========================================================================
-- 1. Problem Based Learning (PBL) — nama live: "Problem Based Learning (PBL)"
-- =========================================================================
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 1, 'Langkah 1: Orientasi Siswa pada Masalah',
  'Guru menyajikan masalah autentik mengenai {topik} pada pelajaran {mapel} dan memotivasi siswa untuk terlibat dalam pemecahan masalah.',
  'Siswa mengamati dan mengidentifikasi masalah tentang {topik} yang disampaikan oleh guru.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Problem Based Learning (PBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 1);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 2, 'Langkah 2: Mengorganisasi Siswa untuk Belajar',
  'Guru membantu siswa mendefinisikan dan mengorganisasikan tugas belajar yang berhubungan dengan {topik}.',
  'Siswa membentuk kelompok diskusi, membagi peran anggota, dan merumuskan hipotesis pemecahan masalah.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Problem Based Learning (PBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 2);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 3, 'Langkah 3: Membimbing Penyelidikan Mandiri/Kelompok',
  'Guru mendorong siswa mengumpulkan informasi yang sesuai, melaksanakan eksperimen, dan mencari penjelasan serta solusi.',
  'Siswa mengumpulkan data, fakta, dan referensi relevan untuk memecahkan masalah {topik} secara kolaboratif.', 25
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Problem Based Learning (PBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 3);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 4, 'Langkah 4: Mengembangkan & Menyajikan Hasil Karya',
  'Guru membantu siswa dalam merencanakan dan menyiapkan karya yang sesuai seperti laporan, model, atau berbagi tugas.',
  'Siswa menyusun hasil diskusi kelompok dan mempresentasikannya di depan kelas.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Problem Based Learning (PBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 4);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 5, 'Langkah 5: Menganalisis & Mengevaluasi Proses',
  'Guru membantu siswa melakukan refleksi atau evaluasi terhadap penyelidikan dan proses-proses yang digunakan.',
  'Siswa melakukan refleksi, mengevaluasi kekuatan dan kelemahan solusi yang ditemukan, serta menarik kesimpulan.', 15
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Problem Based Learning (PBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 5);

-- =========================================================================
-- 2. Project Based Learning (PjBL) — nama live: "Project Based Learning (PjBL)"
-- =========================================================================
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 1, 'Langkah 1: Pertanyaan Mendasar',
  'Guru mengajukan pertanyaan pemantik mengenai {topik} untuk memancing ide rancangan proyek.',
  'Siswa merespons pertanyaan dan mengidentifikasi topik proyek {topik} yang akan dibuat.', 15
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 1);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 2, 'Langkah 2: Desain Perencanaan Proyek',
  'Guru memfasilitasi perencanaan langkah-langkah pembuatan proyek, pembagian peran, dan aturan main.',
  'Siswa merancang sketsa/desain proyek, memilih alat bahan, dan membagi tugas antar-anggota.', 15
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 2);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 3, 'Langkah 3: Menyusun Jadwal Pembuatan',
  'Guru membimbing siswa menyusun alokasi waktu dan batas waktu penyelesaian proyek.',
  'Siswa membuat lini masa (timeline) tahapan pengerjaan proyek dari awal hingga selesai.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 3);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 4, 'Langkah 4: Monitoring Proyek & Kemajuan',
  'Guru memantau keaktifan dan kemajuan pengerjaan proyek siswa serta memberikan bimbingan jika ada kendala.',
  'Siswa mengerjakan proyek {topik} sesuai jadwal dan mencatat perkembangan di lembar kerja.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 4);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 5, 'Langkah 5: Menguji Hasil & Penilaian',
  'Guru menilai ketercapaian standar proyek saat siswa memamerkan atau mendemonstrasikan hasilnya.',
  'Siswa mempresentasikan hasil produk proyek {topik} dan mendemonstrasikan cara kerjanya.', 20
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 5);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 6, 'Langkah 6: Evaluasi Pengalaman Belajar',
  'Guru memfasilitasi refleksi atas seluruh proses pembuatan proyek dan memberikan masukan penyempurnaan.',
  'Siswa melakukan refleksi terhadap kendala yang dihadapi dan manfaat belajar dari pembuatan proyek.', 10
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Project Based Learning (PjBL)'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 6);

-- =========================================================================
-- 3. Discovery Learning — nama live: "Discovery Learning"
-- =========================================================================
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 1, 'Langkah 1: Pemberian Rangsangan (Stimulation)',
  'Guru menampilkan tayangan atau fenomena menarik terkait {topik} untuk memancing rasa ingin tahu siswa.',
  'Siswa mengamati fenomena yang ditampilkan dan mencatat hal-hal yang menarik perhatian.', 10
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 1);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 2, 'Langkah 2: Pernyataan/Identifikasi Masalah (Problem Statement)',
  'Guru memberi kesempatan kepada siswa untuk mengidentifikasi sebanyak mungkin agenda masalah terkait {topik}.',
  'Siswa merumuskan pertanyaan dan hipotesis awal terkait materi {topik}.', 15
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 2);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 3, 'Langkah 3: Pengumpulan Data (Data Collection)',
  'Guru memfasilitasi kegiatan pengumpulan informasi melalui membaca, eksperimen, atau observasi.',
  'Siswa mengumpulkan data dan informasi relevan untuk membuktikan benar tidaknya hipotesis.', 25
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 3);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 4, 'Langkah 4: Pengolahan Data (Data Processing)',
  'Guru membimbing siswa dalam mengolah, mengelompokkan, dan menganalisis data hasil pengamatan.',
  'Siswa mengolah data yang diperoleh dan menafsirkannya ke dalam bentuk tabel atau uraian.', 25
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 4);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 5, 'Langkah 5: Pembuktian (Verification)',
  'Guru mengarahkan siswa melakukan pemeriksaan secara teliti untuk membuktikan temuan dengan hipotesis.',
  'Siswa mencocokkan hasil pengolahan data dengan hipotesis awal untuk membuktikan kebenarannya.', 15
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 5);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 6, 'Langkah 6: Menarik Kesimpulan (Generalization)',
  'Guru membimbing siswa merumuskan kesimpulan umum dari proses discovery {topik}.',
  'Siswa menyusun kesimpulan akhir mengenai prinsip atau konsep utama {topik}.', 10
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Discovery Learning'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 6);

-- =========================================================================
-- 4. Tatap Muka Konvensional — nama live: "Tatap Muka Konvensional"
-- =========================================================================
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 1, 'Langkah 1: Penyampaian Materi',
  'Guru menjelaskan konsep dasar {topik} pada mata pelajaran {mapel} secara runtut dan interaktif.',
  'Siswa menyimak penjelasan guru dan mencatat poin-poin penting materi.', 40
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Tatap Muka Konvensional'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 1);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 2, 'Langkah 2: Tanya Jawab & Diskusi Kelas',
  'Guru mengajukan pertanyaan pemantik dan memandu diskusi kelas untuk menguatkan pemahaman {topik}.',
  'Siswa menjawab pertanyaan guru dan berdiskusi bersama teman sekelas.', 35
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Tatap Muka Konvensional'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 2);

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT m.id, 3, 'Langkah 3: Latihan Terbimbing & Penutup',
  'Guru memberikan latihan terbimbing, mengoreksi bersama, dan menyimpulkan materi {topik}.',
  'Siswa mengerjakan latihan dan menerima umpan balik dari guru.', 25
FROM public.ref_model_pembelajaran m
WHERE m.nama_model = 'Tatap Muka Konvensional'
  AND NOT EXISTS (SELECT 1 FROM public.ref_sintaks_kegiatan s WHERE s.model_id = m.id AND s.urutan = 3);

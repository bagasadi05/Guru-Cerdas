-- 20260722150100_seed_modul_ajar_data.sql
-- Fase 2: Seeding Data dari constants

-- =========================================
-- SEED: ref_boilerplate_topik
-- =========================================
INSERT INTO public.ref_boilerplate_topik (id, mata_pelajaran, topik, fase, tujuan_pembelajaran, pemahaman_bermakna, pertanyaan_pemantik, lkpd_tugas, soal_evaluasi, pengayaan, remedial, daftar_pustaka, is_verified) VALUES (
        '63b905c7-7267-41e1-911a-f3d61aed0eb2',
        'matematika',
        'penjumlahan',
        NULL,
        '["Peserta didik dapat memahami konsep penjumlahan bilangan cacah hingga 100 menggunakan alat peraga.","Peserta didik mampu menyelesaikan masalah konkrit sehari-hari yang berkaitan dengan penjumlahan."]'::jsonb,
        '["Kemampuan menjumlahkan membantu kita menghitung total barang belanjaan, mengumpulkan benda, dan mengelola waktu."]'::jsonb,
        '["Jika kamu memiliki 5 pensil dan temanmu memberikan 3 pensil lagi, berapa banyak pensilmu sekarang?","Bagaimana cara menjumlahkan angka dengan cepat tanpa menulis di kertas?"]'::jsonb,
        'Petunjuk Kerja kelompok:
1. Ambil 10 buah stik es krim yang ada di meja.
2. Gabungkan 4 stik merah dengan 6 stik hijau.
3. Hitunglah total stik gabungan tersebut!
4. Tuliskan kalimat matematikanya di lembar kertas!',
        '1. Hitunglah hasil dari 34 + 25 = ...!
2. Ibu membeli 12 jeruk, ayah membeli 15 jeruk. Berapakah jumlah seluruh jeruk yang dibeli?
3. Jelaskan cara bersusun pendek untuk menghitung 47 + 28!',
        '["Diberikan materi bacaan yang lebih mendalam dan tugas analisis kasus nyata tentang Penjumlahan."]'::jsonb,
        '["Diberikan bimbingan terfokus atau pengerjaan ulang latihan soal dasar terkait Penjumlahan."]'::jsonb,
        '["Buku Panduan Guru Matematika SD/MI Kelas 1 Kemendikbudristek.","Sumber belajar digital platform Guru Belajar Matematika."]'::jsonb,
        true
      );
INSERT INTO public.ref_boilerplate_topik (id, mata_pelajaran, topik, fase, tujuan_pembelajaran, pemahaman_bermakna, pertanyaan_pemantik, lkpd_tugas, soal_evaluasi, pengayaan, remedial, daftar_pustaka, is_verified) VALUES (
        '34ba54ba-02c4-4f42-800e-8d840cc5429b',
        'matematika',
        'perkalian',
        NULL,
        '["Peserta didik dapat memahami perkalian sebagai penjumlahan berulang melalui demonstrasi konkrit.","Peserta didik mampu menghafal tabel perkalian dasar 1 sampai 10."]'::jsonb,
        '["Perkalian mempermudah kita menghitung benda dalam jumlah kelompok yang sama secara cepat."]'::jsonb,
        '["Ada 3 kotak pensil, masing-masing berisi 5 pensil. Bagaimana cara menghitung total pensil dengan cepat?","Mengapa perkalian disebut sebagai penjumlahan yang berulang?"]'::jsonb,
        'Aktivitas Diskusi:
1. Siapkan wadah plastik kecil sebanyak 4 buah.
2. Masukkan 3 kelereng ke dalam setiap wadah.
3. Gambarkan posisi kelereng dan tuliskan bentuk penjumlahan berulangnya!
4. Ubah bentuk penjumlahan berulang tersebut ke dalam operasi perkalian!',
        '1. Ubahlah penjumlahan berikut ke perkalian: 4 + 4 + 4 + 4 + 4 = ... x ... = ...
2. Sebuah meja memiliki 4 kaki. Berapakah jumlah total kaki dari 6 buah meja?
3. Hitunglah hasil dari 8 x 7 = ...!',
        '["Diberikan materi bacaan yang lebih mendalam dan tugas analisis kasus nyata tentang Perkalian."]'::jsonb,
        '["Diberikan bimbingan terfokus atau pengerjaan ulang latihan soal dasar terkait Perkalian."]'::jsonb,
        '["Buku Siswa Matematika SD/MI Kelas 3 Kemendikbudristek.","Alat peraga matematika dekak-dekak perkalian."]'::jsonb,
        true
      );
INSERT INTO public.ref_boilerplate_topik (id, mata_pelajaran, topik, fase, tujuan_pembelajaran, pemahaman_bermakna, pertanyaan_pemantik, lkpd_tugas, soal_evaluasi, pengayaan, remedial, daftar_pustaka, is_verified) VALUES (
        '09bc3a83-b822-455c-b348-6db22b3cf9de',
        'ipas',
        'fotosintesis',
        NULL,
        '["Peserta didik dapat mengidentifikasi bahan-bahan yang diperlukan tumbuhan untuk melakukan proses fotosintesis.","Peserta didik dapat menjelaskan proses fotosintesis dan pentingnya oksigen bagi kehidupan."]'::jsonb,
        '["Tumbuhan adalah produsen makanan di bumi yang menghasilkan oksigen bagi manusia dan hewan untuk bernapas."]'::jsonb,
        '["Bagaimana tumbuhan bisa makan padahal mereka tidak punya mulut dan tidak bisa berjalan?","Mengapa kita merasa segar saat berada di bawah pohon rindang pada siang hari?"]'::jsonb,
        'Eksperimen Sederhana:
1. Siapkan dua pot tanaman kecil yang sejenis.
2. Letakkan Pot A di area terbuka terkena sinar matahari, dan Pot B di dalam kardus gelap.
3. Siram keduanya secara teratur selama 3 hari.
4. Amati perbedaan kesegaran daun pada kedua tanaman tersebut dan diskusikan hasilnya!',
        '1. Sebutkan 4 bahan utama yang dibutuhkan tumbuhan untuk melakukan fotosintesis!
2. Gas apakah yang diserap dan gas apa yang dilepaskan selama proses fotosintesis?
3. Mengapa cahaya matahari sangat penting bagi kelangsungan hidup tumbuhan?',
        '["Diberikan materi bacaan yang lebih mendalam dan tugas analisis kasus nyata tentang Fotosintesis."]'::jsonb,
        '["Diberikan bimbingan terfokus atau pengerjaan ulang latihan soal dasar terkait Fotosintesis."]'::jsonb,
        '["Buku Panduan Guru IPAS SD Kelas 4 Kemendikbudristek.","Modul Pembelajaran Proses Kehidupan Tumbuhan Direktorat SD."]'::jsonb,
        true
      );

-- =========================================
-- SEED: ref_model_pembelajaran & ref_sintaks_kegiatan
-- =========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'hots',
        sumber = 'Arends (2012)',
        kelebihan = '["Konsep tertanam lewat penemuan mandiri","Motivasi belajar meningkat karena masalah dunia nyata","Mengasah kemampuan berpikir kritis"]'::jsonb,
        kekurangan = '["Membutuhkan waktu persiapan lebih lama","Bisa gagal jika masalah tidak autentik bagi siswa"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Problem-Based Learning (PBL)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '286f61b3-f15a-4d10-971f-92294943d389',
      'Problem-Based Learning (PBL)',
      '["Langkah 1: Orientasi Siswa pada Masalah","Langkah 2: Mengorganisasi Siswa untuk Belajar","Langkah 3: Membimbing Penyelidikan Mandiri/Kelompok","Langkah 4: Mengembangkan & Menyajikan Hasil Karya","Langkah 5: Menganalisis & Mengevaluasi Proses"]'::jsonb,
      'hots',
      'Arends (2012)',
      '["Konsep tertanam lewat penemuan mandiri","Motivasi belajar meningkat karena masalah dunia nyata","Mengasah kemampuan berpikir kritis"]'::jsonb,
      '["Membutuhkan waktu persiapan lebih lama","Bisa gagal jika masalah tidak autentik bagi siswa"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Orientasi Siswa pada Masalah', 'Guru menyajikan masalah autentik & berperspektif ganda.', 'Siswa guru menyajikan masalah autentik & berperspektif ganda.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Mengorganisasi Siswa untuk Belajar', 'Siswa membagi peran & merumuskan hipotesis.', 'Siswa siswa membagi peran & merumuskan hipotesis.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Membimbing Penyelidikan Mandiri/Kelompok', 'Siswa mengumpulkan data & fakta.', 'Siswa siswa mengumpulkan data & fakta.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Mengembangkan & Menyajikan Hasil Karya', 'Siswa menyusun laporan/solusi & mempresentasikannya.', 'Siswa siswa menyusun laporan/solusi & mempresentasikannya.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Menganalisis & Mengevaluasi Proses', 'Refleksi terhadap proses pemecahan masalah.', 'Siswa refleksi terhadap proses pemecahan masalah.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'hots',
        sumber = 'Harvard Case Method',
        kelebihan = '["Meningkatkan rasa percaya diri lewat analisis situasi nyata","Mengasah argumentasi lisan & tertulis"]'::jsonb,
        kekurangan = '["Bisa menimbulkan frustrasi jika informasi kasus kurang lengkap"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Case Method (Studi Kasus)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '669099a5-6728-47c1-b1c5-d5ebcb8b4095',
      'Case Method (Studi Kasus)',
      '["Langkah 1: Identifikasi Tujuan Pembelajaran","Langkah 2: Pemilihan & Analisis Situasi Kasus","Langkah 3: Pengelompokan Diskusi","Langkah 4: Rangkuman Solusi Alternatif","Langkah 5: Presentasi & Debat Keputusan","Langkah 6: Evaluasi & Penarikan Kesimpulan"]'::jsonb,
      'hots',
      'Harvard Case Method',
      '["Meningkatkan rasa percaya diri lewat analisis situasi nyata","Mengasah argumentasi lisan & tertulis"]'::jsonb,
      '["Bisa menimbulkan frustrasi jika informasi kasus kurang lengkap"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Identifikasi Tujuan Pembelajaran', 'Penyampaian kasus & tujuan analisis.', 'Siswa penyampaian kasus & tujuan analisis.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pemilihan & Analisis Situasi Kasus', 'Membaca narasi kasus yang kompleks.', 'Siswa membaca narasi kasus yang kompleks.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pengelompokan Diskusi', 'Diskusi kelompok kecil memetakan akar masalah.', 'Siswa diskusi kelompok kecil memetakan akar masalah.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Rangkuman Solusi Alternatif', 'Merumuskan beberapa opsi tindakan.', 'Siswa merumuskan beberapa opsi tindakan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Presentasi & Debat Keputusan', 'Adu argumen antar-kelompok.', 'Siswa adu argumen antar-kelompok.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Evaluasi & Penarikan Kesimpulan', 'Rangkuman akhir dan prinsip umum.', 'Siswa rangkuman akhir dan prinsip umum.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'hots',
        sumber = 'Lucas (2005)',
        kelebihan = '["Menghasilkan produk nyata yang bermanfaat","Melatih manajemen waktu dan kerja kolaboratif"]'::jsonb,
        kekurangan = '["Memerlukan alokasi waktu dan biaya sarana"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Project-Based Learning (PjBL Standar)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '5877ba5a-ef6d-4511-8f73-c7420d76955c',
      'Project-Based Learning (PjBL Standar)',
      '["Langkah 1: Pertanyaan Mendasar","Langkah 2: Desain Perencanaan Proyek","Langkah 3: Menyusun Jadwal Pembuatan","Langkah 4: Monitoring Proyek & Kemajuan","Langkah 5: Menguji Hasil & Penilaian","Langkah 6: Evaluasi Pengalaman Belajar"]'::jsonb,
      'hots',
      'Lucas (2005)',
      '["Menghasilkan produk nyata yang bermanfaat","Melatih manajemen waktu dan kerja kolaboratif"]'::jsonb,
      '["Memerlukan alokasi waktu dan biaya sarana"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pertanyaan Mendasar', 'Menentukan topik utama lewat esensi masalah.', 'Siswa menentukan topik utama lewat esensi masalah.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Desain Perencanaan Proyek', 'Merancang langkah pembuatan & aturan main.', 'Siswa merancang langkah pembuatan & aturan main.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Menyusun Jadwal Pembuatan', 'Membuat timeline & deadline tahapan.', 'Siswa membuat timeline & deadline tahapan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Monitoring Proyek & Kemajuan', 'Guru mendampingi & memantau progress.', 'Siswa guru mendampingi & memantau progress.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Menguji Hasil & Penilaian', 'Pengujian produk/karya di depan umum.', 'Siswa pengujian produk/karya di depan umum.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Evaluasi Pengalaman Belajar', 'Refleksi kendala & pencapaian proyek.', 'Siswa refleksi kendala & pencapaian proyek.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'retensi',
        sumber = 'Bruner (Trianto, 2014)',
        kelebihan = '["Retensi ingatan siswa jauh lebih lama","Melatih keterampilan berpikir induktif"]'::jsonb,
        kekurangan = '["Kurang cocok untuk materi yang sangat abstrak"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Discovery Learning (5/6 Langkah)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '3acf1bb7-9477-4b76-ab32-2446a9f5a58d',
      'Discovery Learning (5/6 Langkah)',
      '["Langkah 1: Pemberian Rangsangan (Stimulation)","Langkah 2: Pernyataan/Identifikasi Masalah (Problem Statement)","Langkah 3: Pengumpulan Data (Data Collection)","Langkah 4: Pengolahan Data (Data Processing)","Langkah 5: Pembuktian (Verification)","Langkah 6: Menarik Kesimpulan (Generalization)"]'::jsonb,
      'retensi',
      'Bruner (Trianto, 2014)',
      '["Retensi ingatan siswa jauh lebih lama","Melatih keterampilan berpikir induktif"]'::jsonb,
      '["Kurang cocok untuk materi yang sangat abstrak"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pemberian Rangsangan (Stimulation)', 'Menampilkan keunikan/fenomena tanpa penjelasan.', 'Siswa menampilkan keunikan/fenomena tanpa penjelasan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pernyataan/Identifikasi Masalah (Problem Statement)', 'Siswa merumuskan pertanyaan/hipotesis.', 'Siswa siswa merumuskan pertanyaan/hipotesis.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pengumpulan Data (Data Collection)', 'Siswa membaca, mengamati, dan bereksperimen.', 'Siswa siswa membaca, mengamati, dan bereksperimen.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Pengolahan Data (Data Processing)', 'Mengolah data menjadi klasifikasi atau pola.', 'Siswa mengolah data menjadi klasifikasi atau pola.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Pembuktian (Verification)', 'Mencocokkan hasil pengolahan dengan hipotesis.', 'Siswa mencocokkan hasil pengolahan dengan hipotesis.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Menarik Kesimpulan (Generalization)', 'Merumuskan prinsip umum atau hukum.', 'Siswa merumuskan prinsip umum atau hukum.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'retensi',
        sumber = 'Suchman (2010)',
        kelebihan = '["Sangat cocok untuk mata pelajaran IPA / IPAS","Membangun sikap ilmiah siswa"]'::jsonb,
        kekurangan = '["Memerlukan kesiapan alat & bahan eksperimen"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      'd19eeae3-cef2-46b6-a1f8-948e63d5a7d3',
      'Inquiry Terbimbing (Guided Inquiry)',
      '["Langkah 1: Orientasi Masalah & Pertanyaan","Langkah 2: Verifikasi Data & Eksperimen","Langkah 3: Formulasi Eksplanasi","Langkah 4: Analisis Proses Inkuiri"]'::jsonb,
      'retensi',
      'Suchman (2010)',
      '["Sangat cocok untuk mata pelajaran IPA / IPAS","Membangun sikap ilmiah siswa"]'::jsonb,
      '["Memerlukan kesiapan alat & bahan eksperimen"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Orientasi Masalah & Pertanyaan', 'Mengajukan pertanyaan penyelidikan.', 'Siswa mengajukan pertanyaan penyelidikan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Verifikasi Data & Eksperimen', 'Melakukan uji coba dengan panduan LKPD.', 'Siswa melakukan uji coba dengan panduan lkpd.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Formulasi Eksplanasi', 'Menyusun penjelasan ilmiah berdasarkan hasil data.', 'Siswa menyusun penjelasan ilmiah berdasarkan hasil data.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Analisis Proses Inkuiri', 'Mengevaluasi keakuratan prosedur eksperimen.', 'Siswa mengevaluasi keakuratan prosedur eksperimen.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw (Model Tim Ahli)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'sosial',
        sumber = 'Aronson (1978)',
        kelebihan = '["Mencegah dominasi siswa cerdas","Tiap siswa punya peran penting (interdependensi positif)"]'::jsonb,
        kekurangan = '["Kondisi kelas bisa sangat ramai saat pergerakan kelompok"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Jigsaw (Model Tim Ahli)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      'b7d47961-9b6e-49ae-b22c-953258a716e1',
      'Jigsaw (Model Tim Ahli)',
      '["Langkah 1: Pembentukan Kelompok Asal","Langkah 2: Diskusi Kelompok Ahli","Langkah 3: Kembali ke Kelompok Asal","Langkah 4: Evaluasi & Kuis Individual"]'::jsonb,
      'sosial',
      'Aronson (1978)',
      '["Mencegah dominasi siswa cerdas","Tiap siswa punya peran penting (interdependensi positif)"]'::jsonb,
      '["Kondisi kelas bisa sangat ramai saat pergerakan kelompok"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pembentukan Kelompok Asal', 'Siswa dibagi ke kelompok heterogen 4-5 orang.', 'Siswa siswa dibagi ke kelompok heterogen 4-5 orang.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw (Model Tim Ahli)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Diskusi Kelompok Ahli', 'Anggota kelompok dengan sub-topik sama berkumpul.', 'Siswa anggota kelompok dengan sub-topik sama berkumpul.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw (Model Tim Ahli)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Kembali ke Kelompok Asal', 'Tiap ahli mengajari sub-topik ke teman sekelompok.', 'Siswa tiap ahli mengajari sub-topik ke teman sekelompok.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw (Model Tim Ahli)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Evaluasi & Kuis Individual', 'Kuis mandiri untuk mengukur pemahaman utuh.', 'Siswa kuis mandiri untuk mengukur pemahaman utuh.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw (Model Tim Ahli)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'sosial',
        sumber = 'Slavin (2010)',
        kelebihan = '["Memotivasi siswa saling membantu agar skor tim naik","Adil karena mengukur peningkatan nilai individu"]'::jsonb,
        kekurangan = '["Memerlukan waktu menghitung skor perkembangan"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      'ddfd351a-40f3-4844-a1d1-06ecb915f4c6',
      'STAD (Student Teams Achievement Divisions)',
      '["Langkah 1: Pengarahan Materi Klasikal","Langkah 2: Kerja Kelompok Heterogen","Langkah 3: Kuis Individual (Tanpa Bantuan)","Langkah 4: Penghargaan Prestasi Tim"]'::jsonb,
      'sosial',
      'Slavin (2010)',
      '["Memotivasi siswa saling membantu agar skor tim naik","Adil karena mengukur peningkatan nilai individu"]'::jsonb,
      '["Memerlukan waktu menghitung skor perkembangan"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pengarahan Materi Klasikal', 'Guru menyampaikan pengantar materi singkat.', 'Siswa guru menyampaikan pengantar materi singkat.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Kerja Kelompok Heterogen', 'Siswa mendiskusikan lembar kerja bersama tim.', 'Siswa siswa mendiskusikan lembar kerja bersama tim.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Kuis Individual (Tanpa Bantuan)', 'Kuis mandiri untuk menghitung skor perkembangan.', 'Siswa kuis mandiri untuk menghitung skor perkembangan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Penghargaan Prestasi Tim', 'Pemberian penghargaan berdasarkan skor kenaikan tim.', 'Siswa pemberian penghargaan berdasarkan skor kenaikan tim.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'TPS (Think-Pair-Share)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'sosial',
        sumber = 'Lyman (1981)',
        kelebihan = '["Sangat praktis dan tidak menyita banyak waktu","Meningkatkan partisipasi aktif siswa pemalu"]'::jsonb,
        kekurangan = '["Memerlukan kontrol agar diskusi pasangan tetap fokus"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'TPS (Think-Pair-Share)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      'af4099e9-716d-496c-9c08-e8e50ad73f2f',
      'TPS (Think-Pair-Share)',
      '["Langkah 1: Think (Berpikir Mandiri)","Langkah 2: Pair (Berpasangan)","Langkah 3: Share (Berbagi ke Kelas)"]'::jsonb,
      'sosial',
      'Lyman (1981)',
      '["Sangat praktis dan tidak menyita banyak waktu","Meningkatkan partisipasi aktif siswa pemalu"]'::jsonb,
      '["Memerlukan kontrol agar diskusi pasangan tetap fokus"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Think (Berpikir Mandiri)', 'Siswa memikirkan jawaban secara individu (1-2 menit).', 'Siswa siswa memikirkan jawaban secara individu (1-2 menit).', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'TPS (Think-Pair-Share)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pair (Berpasangan)', 'Siswa berdiskusi dengan teman sebangku.', 'Siswa siswa berdiskusi dengan teman sebangku.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'TPS (Think-Pair-Share)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Share (Berbagi ke Kelas)', 'Guru memanggil pasangan untuk berbagi di depan kelas.', 'Siswa guru memanggil pasangan untuk berbagi di depan kelas.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'TPS (Think-Pair-Share)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'kbc',
        sumber = 'Panduan KBC Kemenag (2025)',
        kelebihan = '["Sangat selaras dengan indikator karakter KBC","Mengembangkan kecerdasan emosional & spiritual"]'::jsonb,
        kekurangan = '["Membutuhkan kepekaan emosional guru saat fasilitasi"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '1547cc38-623d-4ff4-a16c-8a17e9d9f974',
      'PjBL - FIDS (Feel-Imagine-Do-Share)',
      '["Langkah 1: Feel (Merasakan & Empati Isu)","Langkah 2: Imagine (Membayangkan Solusi Cinta)","Langkah 3: Do (Melakukan & Aksi Nyata)","Langkah 4: Share (Membagikan & Menginspirasi)"]'::jsonb,
      'kbc',
      'Panduan KBC Kemenag (2025)',
      '["Sangat selaras dengan indikator karakter KBC","Mengembangkan kecerdasan emosional & spiritual"]'::jsonb,
      '["Membutuhkan kepekaan emosional guru saat fasilitasi"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Feel (Merasakan & Empati Isu)', 'Merasakan kepedulian lingkungan/sesama.', 'Siswa merasakan kepedulian lingkungan/sesama.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Imagine (Membayangkan Solusi Cinta)', 'Merancang aksi kebaikan kreatif.', 'Siswa merancang aksi kebaikan kreatif.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Do (Melakukan & Aksi Nyata)', 'Praktik membuat proyek kebaikan.', 'Siswa praktik membuat proyek kebaikan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Share (Membagikan & Menginspirasi)', 'Berbagi pengalaman reflektif ke publik.', 'Siswa berbagi pengalaman reflektif ke publik.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'PjBL - FIDS (Feel-Imagine-Do-Share)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'kbc',
        sumber = 'Panduan KBC Kemenag (2025)',
        kelebihan = '["Dilengkapi teknik mindfulness 54321","Mendorong kedamaian batin dan kesadaran utuh"]'::jsonb,
        kekurangan = '["Memerlukan waktu refleksi yang tidak terburu-buru"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Experiential Learning (ARKA)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      'b35ab5a8-29e1-4bd1-96cd-af25c27ecb32',
      'Experiential Learning (ARKA)',
      '["Langkah 1: Aktivitas (Pengalaman Langsung)","Langkah 2: Refleksi (Jurnal Emosi & Nilai)","Langkah 3: Konsep (Pembentukan Makna Abstrak)","Langkah 4: Aplikasi (Penerapan Kebaikan Keseharian)"]'::jsonb,
      'kbc',
      'Panduan KBC Kemenag (2025)',
      '["Dilengkapi teknik mindfulness 54321","Mendorong kedamaian batin dan kesadaran utuh"]'::jsonb,
      '["Memerlukan waktu refleksi yang tidak terburu-buru"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Aktivitas (Pengalaman Langsung)', 'Mengalami simulasi atau praktik nyata.', 'Siswa mengalami simulasi atau praktik nyata.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Refleksi (Jurnal Emosi & Nilai)', 'Merenungkan perasaan dan makna.', 'Siswa merenungkan perasaan dan makna.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Konsep (Pembentukan Makna Abstrak)', 'Menghubungkan dengan konsep sains/agama.', 'Siswa menghubungkan dengan konsep sains/agama.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Aplikasi (Penerapan Kebaikan Keseharian)', 'Komitmen tindakan di kehidupan nyata.', 'Siswa komitmen tindakan di kehidupan nyata.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)') THEN
    UPDATE public.ref_model_pembelajaran
    SET kategori = 'kbc',
        sumber = 'Panduan KBC Kemenag (2025)',
        kelebihan = '["Menjadikan suasana kelas hangat dan bebas dari rasa takut","Menguatkan hubungan batin guru dan murid"]'::jsonb,
        kekurangan = '["Memerlukan energi positif yang konsisten dari guru"]'::jsonb,
        cocok_untuk = '[]'::jsonb
    WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';
  ELSE
    INSERT INTO public.ref_model_pembelajaran (id, nama_model, sintaks_inti, kategori, sumber, kelebihan, kekurangan, cocok_untuk)
    VALUES (
      '0eeb0ff7-312b-4a42-8897-ccd6fe744b6a',
      'Deep Learning (Mindful-Meaningful-Joyful)',
      '["Langkah 1: Mindful (Kehadiran Utuh & Doa Khusyuk)","Langkah 2: Meaningful (Penemuan Makna & Nilai)","Langkah 3: Joyful (Pembelajaran Menggembirakan)"]'::jsonb,
      'kbc',
      'Panduan KBC Kemenag (2025)',
      '["Menjadikan suasana kelas hangat dan bebas dari rasa takut","Menguatkan hubungan batin guru dan murid"]'::jsonb,
      '["Memerlukan energi positif yang konsisten dari guru"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Mindful (Kehadiran Utuh & Doa Khusyuk)', 'Penyadaran emosi & fokus belajar.', 'Siswa penyadaran emosi & fokus belajar.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Meaningful (Penemuan Makna & Nilai)', 'Memahami alasan mendalam materi dipelajari.', 'Siswa memahami alasan mendalam materi dipelajari.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Joyful (Pembelajaran Menggembirakan)', 'Aktivitas eksplorasi yang menyenangkan.', 'Siswa aktivitas eksplorasi yang menyenangkan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

-- =========================================
-- SEED: ref_tema_kbc & ref_materi_insersi
-- =========================================
INSERT INTO public.ref_tema_kbc (id, nama_tema, deskripsi, tujuan, urutan) VALUES (
    '6bcdf217-7d23-4f3c-9bfc-229e19e0e121',
    'Cinta Allah Swt. dan Rasul-Nya',
    'Mengenal sifat jamaliyah Allah & ibadah atas dasar cinta, bukan paksaan.',
    'Mengenal sifat jamaliyah Allah & ibadah atas dasar cinta, bukan paksaan.',
    1
  );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'dfb9434b-ba23-4472-aa16-987bba458951',
      '6bcdf217-7d23-4f3c-9bfc-229e19e0e121',
      'Internalisasi Asmaul Husna (Ar-Rahman, Ar-Rahim, Al-Latif) dalam pembelajaran',
      'inti',
      '...sebagai wujud cinta allah & rasul'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '57bc2103-f863-43f4-a4f2-a8d6a612b145',
      '6bcdf217-7d23-4f3c-9bfc-229e19e0e121',
      'Ibadah sebagai wujud rasa syukur dan cinta kepada Allah Swt.',
      'inti',
      '...sebagai wujud cinta allah & rasul'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '77f2ed0f-b849-4ac0-983c-d7e030d43d96',
      '6bcdf217-7d23-4f3c-9bfc-229e19e0e121',
      'Meneladani sifat kasih sayang dan akhlak Sirah Nabawiyah Rasulullah',
      'inti',
      '...sebagai wujud cinta allah & rasul'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '3c1e0ff7-8eee-4521-8e60-4b126853fd03',
      '6bcdf217-7d23-4f3c-9bfc-229e19e0e121',
      'Penguatan keikhlasan dan niat karena Allah Swt.',
      'inti',
      '...sebagai wujud cinta allah & rasul'
    );
INSERT INTO public.ref_tema_kbc (id, nama_tema, deskripsi, tujuan, urutan) VALUES (
    '6519e1f1-15bf-429f-bd47-a6a5a349a909',
    'Cinta Ilmu',
    'Ilmu sebagai jalan membuka keagungan penciptaan & sarana kebermanfaatan.',
    'Ilmu sebagai jalan membuka keagungan penciptaan & sarana kebermanfaatan.',
    2
  );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '5b44a13c-0809-4654-b838-11eef1ce6fbd',
      '6519e1f1-15bf-429f-bd47-a6a5a349a909',
      'Adab menuntut ilmu (tawakal, tekun, yakin, dan syukur)',
      'inti',
      '...sebagai wujud cinta ilmu'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '7e8dc78f-763f-48af-b70d-34be6d1729b5',
      '6519e1f1-15bf-429f-bd47-a6a5a349a909',
      'Penalaran kritis dan literasi sebagai wujud adab intelektual',
      'inti',
      '...sebagai wujud cinta ilmu'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '1b0a68e5-a407-490c-96cb-a36a9b282b2a',
      '6519e1f1-15bf-429f-bd47-a6a5a349a909',
      'Pemanfaatan teknologi secara bijak dan bertanggung jawab',
      'inti',
      '...sebagai wujud cinta ilmu'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '31cfb6fe-4c93-4267-9212-872c2e43da9f',
      '6519e1f1-15bf-429f-bd47-a6a5a349a909',
      'Hormat dan tawadhu kepada guru serta sumber ilmu',
      'inti',
      '...sebagai wujud cinta ilmu'
    );
INSERT INTO public.ref_tema_kbc (id, nama_tema, deskripsi, tujuan, urutan) VALUES (
    'a3295fcf-3428-445b-bd65-d9cba23e6b94',
    'Cinta Lingkungan',
    'Alam sebagai manifestasi (tajalli) cinta Allah & Rahmatan lil ''alamin.',
    'Alam sebagai manifestasi (tajalli) cinta Allah & Rahmatan lil ''alamin.',
    3
  );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '9bdfd170-9e6c-493e-a8ff-06ead17948e2',
      'a3295fcf-3428-445b-bd65-d9cba23e6b94',
      'Prinsip Rahmatan lil ''alamin dan kepedulian terhadap ekosistem',
      'inti',
      '...sebagai wujud cinta lingkungan'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '7b7c765d-e335-413b-87da-8822ce0bb163',
      'a3295fcf-3428-445b-bd65-d9cba23e6b94',
      'Larangan berbuat fasad (merusak alam) - QS. Al-A''raf: 56 & Ar-Rum: 41',
      'inti',
      '...sebagai wujud cinta lingkungan'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'fc414bcc-ced3-41b6-84a3-575c9bf66597',
      'a3295fcf-3428-445b-bd65-d9cba23e6b94',
      'Hemat energi dan sumber daya air (larangan ishraf)',
      'inti',
      '...sebagai wujud cinta lingkungan'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '89805b42-9008-48c9-bfa0-0b3c6b0b763c',
      'a3295fcf-3428-445b-bd65-d9cba23e6b94',
      'Praktik thaharah dan kebersihan lingkungan sekolah/madrasah',
      'inti',
      '...sebagai wujud cinta lingkungan'
    );
INSERT INTO public.ref_tema_kbc (id, nama_tema, deskripsi, tujuan, urutan) VALUES (
    '7271b153-cc63-486d-9788-bb90dd4f6371',
    'Cinta Diri dan Sesama',
    'Self-compassion, Social Emotional Learning (SEL), & kesetaraan manusia.',
    'Self-compassion, Social Emotional Learning (SEL), & kesetaraan manusia.',
    4
  );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'e8c9c8ca-97ee-41b4-a073-7acddc275a27',
      '7271b153-cc63-486d-9788-bb90dd4f6371',
      'Self-compassion, kesadaran emosional, dan resiliensi diri',
      'inti',
      '...sebagai wujud cinta diri & sesama'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'b6f56568-0e27-4b56-9502-3fe98b60a081',
      '7271b153-cc63-486d-9788-bb90dd4f6371',
      'Ukhuwah Islamiyah, Ukhuwah Insaniyah, dan empati sosial',
      'inti',
      '...sebagai wujud cinta diri & sesama'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '7cfc938e-c1a5-4533-b436-0143dc5ad585',
      '7271b153-cc63-486d-9788-bb90dd4f6371',
      'Adab berinteraksi dengan sesama (orang tua, saudara, teman, tetangga)',
      'inti',
      '...sebagai wujud cinta diri & sesama'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '2db1aab9-9e50-46cb-83b5-d16aa0da5aeb',
      '7271b153-cc63-486d-9788-bb90dd4f6371',
      'Budaya tasamuh (toleransi) dan syura (musyawarah)',
      'inti',
      '...sebagai wujud cinta diri & sesama'
    );
INSERT INTO public.ref_tema_kbc (id, nama_tema, deskripsi, tujuan, urutan) VALUES (
    'e7c8b197-41d4-4257-ae8f-440d9cda0d44',
    'Cinta Tanah Air',
    'Cinta tanah air sebagai bagian dari iman (Hubbul Wathan minal Iman).',
    'Cinta tanah air sebagai bagian dari iman (Hubbul Wathan minal Iman).',
    5
  );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'a03c5a22-fcc1-4f59-819a-4fd09f513986',
      'e7c8b197-41d4-4257-ae8f-440d9cda0d44',
      'Prinsip Hubbul Wathan minal Iman (Cinta Tanah Air bagian dari Iman)',
      'inti',
      '...sebagai wujud cinta tanah air'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'e0ff3681-4b3e-4f59-9b76-17af27094171',
      'e7c8b197-41d4-4257-ae8f-440d9cda0d44',
      'Ukhuwah Wathaniyah dan persatuan dalam keberagaman (QS. Al-Hujurat: 13)',
      'inti',
      '...sebagai wujud cinta tanah air'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      'd1430796-3b07-4376-b838-b45b1257618b',
      'e7c8b197-41d4-4257-ae8f-440d9cda0d44',
      'Menghormati simbol negara dan budaya luhur bangsa',
      'inti',
      '...sebagai wujud cinta tanah air'
    );
INSERT INTO public.ref_materi_insersi (id, tema_id, konten, konteks_penggunaan, frasa_tp) VALUES (
      '4a24abe7-f71a-4262-a7eb-1b4e8239be67',
      'e7c8b197-41d4-4257-ae8f-440d9cda0d44',
      'Kontribusi aktif untuk kemajuan bangsa dan negara',
      'inti',
      '...sebagai wujud cinta tanah air'
    );

-- =========================================
-- SEED: ref_rubrik_template
-- =========================================
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'diskusi',
      'Keaktifan Diskusi',
      'Siswa aktif memberikan ide secara konsisten dan memimpin jalannya diskusi.',
      'Siswa aktif memberikan ide beberapa kali selama diskusi.',
      'Siswa sesekali memberikan pendapat jika ditanya.',
      'Siswa pasif dan tidak memberikan pendapat sama sekali.',
      1
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'diskusi',
      'Kerjasama Kelompok',
      'Sangat kooperatif, membantu teman kelompok, dan berbagi tugas dengan adil.',
      'Kooperatif dan melaksanakan tugas kelompok yang diberikan.',
      'Hanya mau bekerjasama setelah mendapat dorongan guru.',
      'Tidak mau bekerjasama dan mengganggu konsentrasi kelompok.',
      2
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'diskusi',
      'Menghargai Pendapat',
      'Mendengarkan dengan penuh hormat dan menanggapi ide teman dengan bahasa yang sangat sopan.',
      'Mendengarkan pendapat teman dan tidak memotong pembicaraan.',
      'Sesekali memotong pembicaraan atau kurang menghormati pendapat teman.',
      'Sama sekali tidak menghargai pendapat orang lain.',
      3
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'presentasi',
      'Penguasaan Materi',
      'Menjelaskan konsep secara mendalam tanpa melihat catatan dan menjawab pertanyaan dengan tepat.',
      'Menjelaskan konsep dengan baik tetapi sesekali melihat catatan.',
      'Membaca sebagian besar slide/catatan saat menjelaskan materi.',
      'Tidak memahami materi dan hanya membaca slide tanpa penjelasan.',
      1
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'presentasi',
      'Kemampuan Berbicara',
      'Suara terdengar jelas di seluruh kelas, intonasi menarik, dan sangat percaya diri.',
      'Suara jelas tetapi intonasi agak monoton.',
      'Suara lirih dan kurang terdengar jelas di bagian belakang kelas.',
      'Bergumam, tidak terdengar, dan terlihat sangat cemas.',
      2
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'presentasi',
      'Sikap Kerja',
      'Kontak mata konsisten dengan audiens, gestur tubuh natural, dan sopan.',
      'Ada kontak mata sesekali, berdiri dengan tegak dan sopan.',
      'Kurang kontak mata dan berdiri kurang tegap.',
      'Membelakangi audiens sepanjang presentasi.',
      3
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'sikap',
      'Kemandirian Belajar',
      'Memulai tugas sendiri tanpa diperintah, fokus penuh, dan menyelesaikan tepat waktu.',
      'Mengerjakan tugas dengan tertib dan selesai tepat waktu.',
      'Membutuhkan dorongan guru beberapa kali untuk menyelesaikan tugas.',
      'Tidak menyelesaikan tugas meskipun sudah dibimbing guru.',
      1
    );
INSERT INTO public.ref_rubrik_template (kategori, kriteria, sangat_baik, baik, cukup, perlu_bimbingan, urutan) VALUES (
      'sikap',
      'Bernalar Kritis',
      'Sering bertanya kritis, menganalisis masalah secara mandiri, dan memberi argumen logis.',
      'Menjawab pertanyaan guru dengan penjelasan logis.',
      'Hanya menjawab secara singkat tanpa disertai alasan.',
      'Belum mampu memberikan tanggapan atau alasan logis.',
      2
    );

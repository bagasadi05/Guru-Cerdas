-- 20260722160000_fix_sintaks_kegiatan_content.sql
-- P0-2: Tulis ulang seed ref_sintaks_kegiatan dengan kalimat gramatikal & estimasi_menit_persen berjumlah 100 per model

DELETE FROM public.ref_sintaks_kegiatan;

-- 1. Problem-Based Learning (PBL)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Orientasi Siswa pada Masalah', 
  'Guru menyajikan masalah autentik mengenai {topik} pada pelajaran {mapel} dan memotivasi siswa untuk terlibat dalam pemecahan masalah.', 
  'Siswa mengamati dan mengidentifikasi masalah tentang {topik} yang disampaikan oleh guru.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Mengorganisasi Siswa untuk Belajar', 
  'Guru membantu siswa mendefinisikan dan mengorganisasikan tugas belajar yang berhubungan dengan {topik}.', 
  'Siswa membentuk kelompok diskusi, membagi peran anggota, dan merumuskan hipotesis pemecahan masalah.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Membimbing Penyelidikan Mandiri/Kelompok', 
  'Guru mendorong siswa mengumpulkan informasi yang sesuai, melaksanakan eksperimen, dan mencari penjelasan serta solusi.', 
  'Siswa mengumpulkan data, fakta, dan referensi relevan untuk memecahkan masalah {topik} secara kolaboratif.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Mengembangkan & Menyajikan Hasil Karya', 
  'Guru membantu siswa dalam merencanakan dan menyiapkan karya yang sesuai seperti laporan, model, atau berbagi tugas.', 
  'Siswa menyusun hasil diskusi kelompok dan mempresentasikannya di depan kelas.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Menganalisis & Mengevaluasi Proses', 
  'Guru membantu siswa melakukan refleksi atau evaluasi terhadap penyelidikan dan proses-proses yang digunakan.', 
  'Siswa melakukan refleksi, mengevaluasi kekuatan dan kelemahan solusi yang ditemukan, serta menarik kesimpulan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Problem-Based Learning (PBL)';

-- 2. Case Method (Studi Kasus)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Identifikasi Tujuan Pembelajaran', 
  'Guru menyampaikan kasus nyata {topik} dan menjelaskan tujuan analisis yang akan dicapai.', 
  'Siswa menyimak kasus yang disajikan dan memahami fokus masalah {topik} yang harus dianalisis.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pemilihan & Analisis Situasi Kasus', 
  'Guru membagikan bahan kasus {topik} dan memberikan panduan pertanyaan analisis.', 
  'Siswa membaca narasi kasus secara cermat serta mencatat poin kunci dan permasalahan utama.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pengelompokan Diskusi', 
  'Guru memfasilitasi diskusi kelompok kecil untuk memetakan akar penyebab masalah.', 
  'Siswa berdiskusi dalam kelompok untuk menguraikan faktor penyebab dan dampak dari kasus {topik}.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Rangkuman Solusi Alternatif', 
  'Guru membimbing siswa merumuskan berbagai alternatif keputusan beserta risiko masing-masing.', 
  'Siswa merumuskan beberapa pilihan solusi kreatif untuk menyelesaikan kasus {topik}.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Presentasi & Debat Keputusan', 
  'Guru memimpin jalannya presentasi antar-kelompok dan mengarahkan sesi tanya jawab.', 
  'Siswa menyampaikan solusi kelompoknya dan merespons tanggapan atau argumen dari kelompok lain.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Evaluasi & Penarikan Kesimpulan', 
  'Guru memberikan penguatan, mengevaluasi keputusan yang diambil, dan menyimpulkan pembelajaran.', 
  'Siswa menyimpulkan pelajaran utama dari analisis kasus {topik}.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Case Method (Studi Kasus)';

-- 3. Project-Based Learning (PjBL Standar)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pertanyaan Mendasar', 
  'Guru mengajukan pertanyaan pemantik mengenai {topik} untuk memancing ide rancangan proyek.', 
  'Siswa merespons pertanyaan dan mengidentifikasi topik proyek {topik} yang akan dibuat.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Desain Perencanaan Proyek', 
  'Guru memfasilitasi perencanaan langkah-langkah pembuatan proyek, pembagian peran, dan aturan main.', 
  'Siswa merancang sketsa/desain proyek, memilih alat bahan, dan membagi tugas antar-anggota.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Menyusun Jadwal Pembuatan', 
  'Guru membimbing siswa menyusun alokasi waktu dan batas waktu penyelesaian proyek.', 
  'Siswa membuat lini masa (timeline) tahapan pengerjaan proyek dari awal hingga selesai.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Monitoring Proyek & Kemajuan', 
  'Guru memantau keaktifan dan kemajuan pengerjaan proyek siswa serta memberikan bimbingan jika ada kendala.', 
  'Siswa mengerjakan proyek {topik} sesuai jadwal dan mencatat perkembangan di lembar kerja.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Menguji Hasil & Penilaian', 
  'Guru menilai ketercapaian standar proyek saat siswa memamerkan atau mendemonstrasikan hasilnya.', 
  'Siswa mempresentasikan hasil produk proyek {topik} dan mendemonstrasikan cara kerjanya.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Evaluasi Pengalaman Belajar', 
  'Guru memfasilitasi refleksi atas seluruh proses pembuatan proyek dan memberikan masukan penyempurnaan.', 
  'Siswa melakukan refleksi terhadap kendala yang dihadapi dan manfaat belajar dari pembuatan proyek.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project-Based Learning (PjBL Standar)';

-- 4. Discovery Learning (5/6 Langkah)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pemberian Rangsangan (Stimulation)', 
  'Guru menampilkan tayangan atau fenomena menarik terkait {topik} untuk memancing rasa ingin tahu siswa.', 
  'Siswa mengamati fenomena yang ditampilkan dan mencatat hal-hal yang menarik perhatian.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pernyataan/Identifikasi Masalah (Problem Statement)', 
  'Guru memberi kesempatan kepada siswa untuk mengidentifikasi sebanyak mungkin agenda masalah terkait {topik}.', 
  'Siswa merumuskan pertanyaan dan hipotesis awal terkait materi {topik}.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pengumpulan Data (Data Collection)', 
  'Guru memfasilitasi kegiatan pengumpulan informasi melalui membaca, eksperimen, atau observasi.', 
  'Siswa mengumpulkan data dan informasi relevan untuk membuktikan benar tidaknya hipotesis.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Pengolahan Data (Data Processing)', 
  'Guru membimbing siswa dalam mengolah, mengelompokkan, dan menganalisis data hasil pengamatan.', 
  'Siswa mengolah data yang diperoleh dan menafsirkannya ke dalam bentuk tabel atau uraian.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Pembuktian (Verification)', 
  'Guru mengarahkan siswa melakukan pemeriksaan secara teliti untuk membuktikan temuan dengan hipotesis.', 
  'Siswa mencocokkan hasil pengolahan data dengan hipotesis awal untuk membuktikan kebenarannya.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 6, 'Langkah 6: Menarik Kesimpulan (Generalization)', 
  'Guru membimbing siswa merumuskan kesimpulan umum dari proses discovery {topik}.', 
  'Siswa menyusun kesimpulan akhir mengenai prinsip atau konsep utama {topik}.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning (5/6 Langkah)';

-- 5. Inquiry Terbimbing (Guided Inquiry)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Orientasi Masalah & Pertanyaan', 
  'Guru menyajikan situasi konflik kognitif dan mengajukan pertanyaan inkuiri mengenai {topik}.', 
  'Siswa merespons pertanyaan inkuiri dan memfokuskan perhatian pada masalah yang diajukan.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Verifikasi Data & Eksperimen', 
  'Guru menyediakan alat/bahan dan membimbing rancangan percobaan atau pengumpulan data.', 
  'Siswa melakukan eksperimen atau pengamatan sesuai petunjuk LKPD untuk mengumpulkan data.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Formulasi Eksplanasi', 
  'Guru membimbing siswa menganalisis data pengamatan dan merumuskan penjelasan ilmiah.', 
  'Siswa mendiskusikan temuan eksperimen dan menyusun penjelasan sistematis mengenai {topik}.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Analisis Proses Inkuiri', 
  'Guru memfasilitasi evaluasi terhadap strategi penyelidikan yang telah dilakukan siswa.', 
  'Siswa menganalisis kelebihan dan kekurangan langkah inkuiri yang telah mereka jalankan.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Inquiry Terbimbing (Guided Inquiry)';

-- 6. STAD
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Presentasi Materi', 
  'Guru menyampaikan konsep dasar {topik} pada mata pelajaran {mapel} secara langsung.', 
  'Siswa mendengarkan penjelasan guru dan mencatat poin-poin penting materi.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Kegiatan Belajar Kelompok', 
  'Guru membagi siswa ke dalam kelompok heterogen dan memberikan lembar kerja latihan.', 
  'Siswa bekerja sama dalam kelompok, saling membantu menguasai materi {topik}.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Kuis Mandiri', 
  'Guru mengoperasikan kuis atau tes individu tanpa bantuan teman kelompok.', 
  'Siswa mengerjakan kuis secara mandiri untuk menunjukkan tingkat pemahaman masing-masing.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Perhitungan Skor Kemajuan', 
  'Guru menghitung skor kemajuan individu dan skor akumulasi kelompok.', 
  'Siswa menerima umpan balik skor peningkatan diri dan kelompok.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Penghargaan Kelompok', 
  'Guru memberikan apresiasi/sertifikat kepada kelompok yang mencapai kriteria kelayakan.', 
  'Siswa merayakan pencapaian tim dan terevaluasi untuk perbaikan belajar berikutnya.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'STAD (Student Teams Achievement Divisions)';

-- 7. Jigsaw
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Pembentukan Kelompok Asal', 
  'Guru membagi siswa ke dalam kelompok asal heterogen dan membagikan sub-topik {topik}.', 
  'Siswa berkumpul di kelompok asal dan menerima bagian sub-topik yang menjadi tanggung jawabnya.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Diskusi Kelompok Ahli', 
  'Guru mengarahkan siswa yang memegang sub-topik sama untuk berkumpul di kelompok ahli.', 
  'Siswa berdiskusi intensif di kelompok ahli untuk mendalami dan menguasai sub-topik tersebut.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pelaporan Kembali ke Kelompok Asal', 
  'Guru meminta siswa kembali ke kelompok asal untuk mengajarkan sub-topik yang dispesialisasi.', 
  'Siswa bergantian mengajari teman sekelompoknya hingga seluruh anggota menguasai semua sub-topik {topik}.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Evaluasi & Kuis', 
  'Guru memberikan kuis individual yang mencakup seluruh sub-materi {topik}.', 
  'Siswa menjawab kuis individual tanpa bantuan teman kelompok.', 15
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 5, 'Langkah 5: Penghargaan Tim', 
  'Guru memberi penghargaan pada tim berdasarkan rata-rata skor peningkatan anggotanya.', 
  'Siswa menyimak hasil evaluasi kelompok dan apresiasi dari guru.', 10
FROM public.ref_model_pembelajaran WHERE nama_model = 'Jigsaw';

-- 8. Think-Pair-Share (TPS)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Think (Berpikir Mandiri)', 
  'Guru mengajukan pertanyaan atau masalah terkait {topik} dan memberi waktu untuk berpikir mandiri.', 
  'Siswa memikirkan dan menuliskan jawaban atau gagasan secara mandiri tanpa berdiskusi.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Think-Pair-Share (TPS)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Pair (Berpasangan)', 
  'Guru meminta siswa berpasangan dengan teman di sebelahnya untuk mendiskusikan hasil pemikiran.', 
  'Siswa berdiskusi dengan pasangannya, berbagi ide, dan menyatukan jawaban terbaik.', 40
FROM public.ref_model_pembelajaran WHERE nama_model = 'Think-Pair-Share (TPS)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Share (Berbagi ke Kelas)', 
  'Guru menunjuk beberapa pasangan untuk membagikan hasil diskusi mereka ke seluruh kelas.', 
  'Siswa mempresentasikan hasil kesepakatan pasangannya dan merespons gagasan pasangan lain.', 35
FROM public.ref_model_pembelajaran WHERE nama_model = 'Think-Pair-Share (TPS)';

-- 9. Project Based Learning (PjBL - FIDS)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Feel (Merasakan & Mengidentifikasi Isu)', 
  'Guru membimbing siswa menggugah kepedulian sosial/lingkungan terkait {topik}.', 
  'Siswa mengamati dan merasakan permasalahan nyata di sekitar terkait {topik}.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project Based Learning (PjBL - FIDS)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Imagine (Membayangkan Solusi Berbasis Cinta)', 
  'Guru memfasilitasi sesi curah pendapat (brainstorming) ide solusi kreatif bermuatan nilai cinta.', 
  'Siswa membayangkan dan merancang solusi penuh kasih sayang untuk mengatasi isu {topik}.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project Based Learning (PjBL - FIDS)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Do (Melakukan & Membuat Proyek)', 
  'Guru memantau dan mendampingi pembuatan aksi nyata/produk proyek oleh siswa.', 
  'Siswa mengeksekusi pembuatan proyek {topik} secara bergotong-royong.', 35
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project Based Learning (PjBL - FIDS)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Share (Membagikan & Menginspirasi Sesama)', 
  'Guru memfasilitasi pameran atau penyebaran hasil karya inspiratif siswa.', 
  'Siswa membagikan hasil proyek dan menginspirasi teman serta masyarakat.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Project Based Learning (PjBL - FIDS)';

-- 10. Experiential Learning (ARKA)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Aktivitas (Pengalaman Langsung)', 
  'Guru memfasilitasi kegiatan eksplorasi atau simulasi langsung terkait {topik}.', 
  'Siswa melakukan aktivitas atau permainan edukatif untuk mengalami secara langsung konsep {topik}.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Refleksi (Refleksi Emosional & Nilai)', 
  'Guru mengajukan pertanyaan reflektif mengenai perasaan dan makna selama aktivitas.', 
  'Siswa merenungkan perasaan, pengalaman emosional, dan nilai-nilai yang dipelajari.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Konsep (Pembentukan Makna & Konsep)', 
  'Guru membimbing siswa menghubungkan hasil refleksi dengan konsep teori {topik}.', 
  'Siswa menyimpulkan konsep ilmiah dan nilai cinta yang terkandung dalam materi.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Aplikasi (Penerapan Kebaikan Keseharian)', 
  'Guru mendorong siswa merencanakan aksi nyata penerapan konsep dalam kehidupan.', 
  'Siswa menyusun komitmen tindakan nyata untuk menerapkan kebaikan {topik} sehari-hari.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'Experiential Learning (ARKA)';

-- 11. Deep Learning (Mindful-Meaningful-Joyful)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Mindful (Kehadiran Utuh & Kesadaran Diri)', 
  'Guru mengondisikan suasana tenang, mengajak siswa fokus utuh dan menyadari tujuan belajar {topik}.', 
  'Siswa menenangkan pikiran, mengambil napas dalam, dan menyiapkan kesadaran penuh untuk belajar.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Meaningful (Penemuan Makna & Nilai Cinta)', 
  'Guru memfasilitasi eksplorasi materi {topik} yang menghubungkan ilmu dengan kebermanfaatan hidup.', 
  'Siswa mendalami materi {topik} dan menemukan pesan moral serta manfaat nyata bagi kehidupan.', 40
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Joyful (Pembelajaran Bermakna & Menggembirakan)', 
  'Guru menyajikan tantangan kreatif atau permainan edukatif yang menggembirakan.', 
  'Siswa mengekspresikan pemahaman {topik} dengan gembira melalui karya atau presentasi menarik.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Deep Learning (Mindful-Meaningful-Joyful)';

-- 12. LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Literasi (Eksplorasi Informasi & Nilai)', 
  'Guru menyediakan bahan bacaan/media literasi bermuatan nilai cinta terkait {topik}.', 
  'Siswa membaca, menyimak, dan menggali informasi utama dari bahan literasi {topik}.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Orientasi (Penetapan Tujuan & Adab)', 
  'Guru membimbing penentuan fokus belajar dan penanaman adab menuntut ilmu.', 
  'Siswa menetapkan target belajar kelompok dan menerapkan kesepakatan adab belajar.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Kolaborasi (Kerja Sama & Ukhuwah)', 
  'Guru mengarahkan kerja sama kelompok yang saling menghargai dan melengkapi.', 
  'Siswa berdiskusi aktif, berkolaborasi menyelesaikan tugas {topik} dengan semangat ukhuwah.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Refleksi (Evaluasi Karakter & Penutupan)', 
  'Guru memimpin refleksi pencapaian pengetahuan dan penguatan karakter cinta.', 
  'Siswa menyampaikan refleksi tentang perubahan pengetahuan dan sikap yang mereka alami.', 25
FROM public.ref_model_pembelajaran WHERE nama_model = 'LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)';

-- 13. Discovery Learning KBC
INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 1, 'Langkah 1: Stimulasi (Penyajian Fenomena & Kasih Sayang Allah)', 
  'Guru menyajikan fenomena alam/sosial terkait {topik} sebagai wujud kasih sayang Allah Swt.', 
  'Siswa mengamati fenomena {topik} dengan penuh rasa kagum dan kecintaan.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning KBC';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 2, 'Langkah 2: Identifikasi Masalah & Pengumpulan Data', 
  'Guru memfasilitasi siswa merumuskan pertanyaan dan mengumpulkan data secara santun.', 
  'Siswa merumuskan pertanyaan dan mengumpulkan fakta {topik} melalui kerja sama ramah.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning KBC';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 3, 'Langkah 3: Pengolahan Data & Pembuktian', 
  'Guru membimbing pengolahan data dengan kejujuran dan ketelitian.', 
  'Siswa menganalisis data {topik} serta membuktikan kebenaran hipotesis secara objektif.', 30
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning KBC';

INSERT INTO public.ref_sintaks_kegiatan (model_id, urutan, nama_langkah, kegiatan_guru, kegiatan_siswa, estimasi_menit_persen)
SELECT id, 4, 'Langkah 4: Penarikan Kesimpulan & Inovasi Kebaikan', 
  'Guru mengarahkan perumusan kesimpulan yang memuat komitmen perbuatan baik.', 
  'Siswa menyimpulkan materi {topik} dan menentukan rencana aksi kebaikan nyata.', 20
FROM public.ref_model_pembelajaran WHERE nama_model = 'Discovery Learning KBC';

-- 20260722180000_seed_comprehensive_modul_ajar_bank.sql
-- Memperluas Bank Konten Modul Ajar (ref_boilerplate_topik) berdasarkan kurikulum & data sekolah (MI Al Irsyad / SD)

-- Ensure ON CONFLICT handling or INSERT IGNORE logic
INSERT INTO public.ref_boilerplate_topik (id, mata_pelajaran, topik, fase, tujuan_pembelajaran, pemahaman_bermakna, pertanyaan_pemantik, lkpd_tugas, soal_evaluasi, pengayaan, remedial, daftar_pustaka, is_verified)
VALUES
-- 1. Matematika - Pengurangan (Fase A)
(
  'a1b2c3d4-0001-4000-8000-000000000001',
  'matematika',
  'pengurangan',
  'A',
  '["Peserta didik dapat memahami konsep pengurangan sebagai mengambil atau memisahkan sejumlah benda.","Peserta didik mampu menyelesaikan soal cerita pengurangan bilangan cacah sampai dengan 20."]'::jsonb,
  '["Pengurangan membantu kita menghitung sisa barang, selisih jumlah, dan kembalian uang belanja."]'::jsonb,
  '["Jika kamu punya 8 kue dan dimakan 3 kue, berapa sisa kuemu?","Bagaimana cara menghitung sisa benda yang hilang atau dipakai?"]'::jsonb,
  'Lembar Kerja Kelompok:
1. Siapkan 15 buah manik-manik di meja.
2. Ambil 6 manik-manik dan pisahkan ke wadah lain.
3. Hitung sisa manik-manik yang tertinggal di tempat awal!
4. Tuliskan bentuk matematika pengurangannya!',
  '1. Hitunglah 18 - 7 = ...
2. Budi memiliki 15 balon, lalu pecah 4 balon. Berapa balon Budi yang masih utuh?
3. Selesaikan operasi pengurangan bersusun: 29 - 14 = ...',
  '["Diberikan latihan pengurangan angka ratusan menggunakan alat peraga abakus/sempoa."]'::jsonb,
  '["Bimbingan individual dengan peragaan pengurangan konkret menggunakan benda di sekitar."]'::jsonb,
  '["Buku Panduan Guru Matematika Kelas 1 Kemendikbudristek.","Media Pembelajaran Manik-Manik Berwarna."]'::jsonb,
  true
),
-- 2. Matematika - Pembagian (Fase B)
(
  'a1b2c3d4-0002-4000-8000-000000000002',
  'matematika',
  'pembagian',
  'B',
  '["Peserta didik memahami pembagian sebagai pengurangan berulang dan pembagian adil sama rata.","Peserta didik dapat menyelesaikan operasi pembagian dua angka dengan satu angka."]'::jsonb,
  '["Pembagian mengajarkan kita sikap adil dalam berbagi makanan atau benda kepada teman."]'::jsonb,
  '["Jika ada 12 permen dibagikan sama rata kepada 3 anak, berapa permen yang didapat tiap anak?","Apa hubungan antara pembagian dan perkalian?"]'::jsonb,
  'Aktivitas Berbagi Adil:
1. Ambil 20 biji congklak.
2. Bagikan ke dalam 4 piring kecil hingga habis sama rata.
3. Hitung berapa isi biji di setiap piring!
4. Tuliskan dalam kalimat pengurangan berulang sampai habis 0!',
  '1. Hitunglah 36 : 4 = ...
2. Ibu membagikan 45 buah apel kepada 9 tetangga secara merata. Berapa buah yang diterima tiap tetangga?
3. Ubahlah bentuk perkalian 7 x 8 = 56 menjadi dua bentuk operasi pembagian!',
  '["Tugas memecahkan soal cerita pembagian bersisa dan pembagian tiga angka."]'::jsonb,
  '["Remedial terbimbing pengurangan berulang menggunakan benda konkret."]'::jsonb,
  '["Buku Guru Matematika Kelas 4 Kemendikbudristek."]'::jsonb,
  true
),
-- 3. Matematika - Pecahan Sederhana (Fase B)
(
  'a1b2c3d4-0003-4000-8000-000000000003',
  'matematika',
  'pecahan',
  'B',
  '["Peserta didik dapat mengenali dan menyatakan pecahan 1/2, 1/3, dan 1/4 menggunakan benda konkret.","Peserta didik mampu membandingkan nilai dua pecahan pembilang satu."]'::jsonb,
  '["Pecahan membantu kita membagi potongan makanan atau benda menjadi bagian-bagian sama besar."]'::jsonb,
  '["Jika satu loyang kue dipotong menjadi 4 bagian sama besar, berapa nilai satu potong kue tersebut?","Mana yang lebih besar, 1/2 potong pizza atau 1/4 potong pizza?"]'::jsonb,
  'Eksperimen Potong Kertas:
1. Lipat selembar kertas lipat menjadi 2 bagian sama besar lalu potong.
2. Arsir satu bagian dan tuliskan nilai pecahannya!
3. Ulangi dengan melipat kertas kedua menjadi 4 bagian sama besar!',
  '1. Tuliskan lambang pecahan untuk satu dari tiga bagian sama besar!
2. Manakah yang lebih besar antara 1/3 dengan 1/5?
3. Gambarkan bentuk pecahan 3/4 menggunakan lingkaran!',
  '["Eksplorasi penjumlahan pecahan berpenyebut sama."]'::jsonb,
  '["Bimbingan melipat dan mengarsir kertas origami pecahan."]'::jsonb,
  '["Buku Pembelajaran Matematika SD Kurikulum Merdeka."]'::jsonb,
  true
),
-- 4. Bahasa Indonesia - Kosa Kata Baru (Fase A)
(
  'a1b2c3d4-0004-4000-8000-000000000004',
  'bahasa indonesia',
  'kosa kata baru',
  'A',
  '["Peserta didik dapat menemukan kosa kata baru dari teks cerita yang dibacakan.","Peserta didik mampu menjelaskan arti kosa kata baru dan menggunakannya dalam kalimat sederhana."]'::jsonb,
  '["Kosa kata yang kaya mempermudah kita menyampaikan pikiran dan perasaan kepada orang lain."]'::jsonb,
  '["Kata apa yang baru pertama kali kamu dengar dari cerita tadi?","Bagaimana cara mencari tahu arti kata yang belum kita mengerti?"]'::jsonb,
  'Lembar Literasi Kata:
1. Lingkari 3 kata sulit dari cerita "Petualangan Kiki si Kelinci".
2. Tanyakan artinya kepada guru atau lihat di kamus bergambar.
3. Buatlah 1 kalimat baru menggunakan kata tersebut!',
  '1. Apakah arti dari kata "Tawadhu"?
2. Buatlah satu kalimat sederhana menggunakan kata "Rajin"!
3. Jodohkan kata baru di Kolom A dengan gambarnya di Kolom B!',
  '["Tugas membuat kamus mini bergambar buatan sendiri."]'::jsonb,
  '["Membaca nyaring bersama guru dan menebak arti kata lewat konteks gambar."]'::jsonb,
  '["Buku Siswa Bahasa Indonesia Kelas 2 Kemendikbudristek."]'::jsonb,
  true
),
-- 5. Bahasa Indonesia - Kalimat Efektif (Fase B)
(
  'a1b2c3d4-0005-4000-8000-000000000005',
  'bahasa indonesia',
  'kalimat efektif',
  'B',
  '["Peserta didik dapat mengidentifikasi unsur SPOK (Subjek, Predikat, Objek, Keterangan) dalam kalimat.","Peserta didik mampu menyusun kalimat efektif yang ringkas dan mudah dipahami."]'::jsonb,
  '["Kalimat efektif membuat pesan yang disampaikan menjadi jelas dan tidak menimbulkan salah paham."]'::jsonb,
  '["Mengapa kalimat yang terlalu panjang dan berbelit-belit sulit dipahami?","Bagaimana struktur susunan kalimat yang baik?"]'::jsonb,
  'Analisis Struktur Kalimat:
1. Baca paragraf yang disediakan.
2. Temukan dan garis bawahi Subjek (S) warna merah dan Predikat (P) warna biru.
3. Perbaiki kalimat yang tidak efektif menjadi efektif!',
  '1. Tentukan Subjek dan Predikat pada kalimat: "Ibu membeli sayur di pasar pagi ini"!
2. Perbaikilah kalimat tidak efektif berikut: "Siswa-siswa berkumpul bersama-sama di lapangan"!
3. Buatlah kalimat efektif mengandung SPOK dengan topik lingkungan!',
  '["Menulis karangan pendek 3 paragraf menggunakan kalimat efektif dan ejaan EYD yang tepat."]'::jsonb,
  '["Latihan memisahkan kata menjadi unsur S-P-O-K sederhana."]'::jsonb,
  '["Buku Panduan Bahasa Indonesia SD Kelas 4."]'::jsonb,
  true
),
-- 6. IPAS - Wujud Zat dan Perubahannya (Fase B)
(
  'a1b2c3d4-0006-4000-8000-000000000006',
  'ipas',
  'wujud zat',
  'B',
  '["Peserta didik dapat mengidentifikasi wujud zat (padat, cair, gas) beserta sifat-sifatnya.","Peserta didik dapat menganalisis perubahan wujud zat (mencair, membeku, menguap, mengembun, menyublim)."]'::jsonb,
  '["Memahami wujud zat membantu kita memanfaatkan benda di sekitar seperti es, air minum, dan udara untuk kehidupan."]'::jsonb,
  '["Mengapa es batu yang dibiarkan di udara terbuka lama-lama menjadi air?","Benda apa saja di kelas ini yang termasuk zat padat, cair, dan gas?"]'::jsonb,
  'Percobaan Perubahan Wujud:
1. Amatilah es batu yang diletakkan di atas piring transparan.
2. Amati pula uap air dari air panas yang ditutup tutup gelas.
3. Catat perubahan wujud yang terjadi dan wujud zat awal serta akhirnya!',
  '1. Sebutkan 3 contoh benda berwujud gas di sekitar kita!
2. Apakah yang dimaksud dengan proses mengembun? Berikan contohnya!
3. Mengapa kapur barus yang ditaruh di lemari makin lama makin habis?',
  '["Tugas membuat infografis/poster skema perubahan wujud zat."]'::jsonb,
  '["Pengamatan langsung mencairnya lilin atau es batu bersama guru."]'::jsonb,
  '["Buku Panduan Guru IPAS SD Kelas 4 Kemendikbudristek."]'::jsonb,
  true
),
-- 7. IPAS - Panca Indra Manusia (Fase A)
(
  'a1b2c3d4-0007-4000-8000-000000000007',
  'ipas',
  'panca indra',
  'A',
  '["Peserta didik dapat menyebutkan 5 panca indra manusia beserta fungsinya.","Peserta didik dapat merawat kebersihan dan kesehatan panca indra sebagai wujud syukur kepada Tuhan."]'::jsonb,
  '["Panca indra adalah karunia Allah Swt. yang memungkinkan kita melihat, mendengar, membaui, meraba, dan merasakan keindahan alam."]'::jsonb,
  '["Indra apa yang kita gunakan untuk mendengarkan suara musik yang indah?","Bagaimana jadinya jika mata kita tidak bisa melihat?"]'::jsonb,
  'Permainan Detektif Indra:
1. Tutup mata temanmu dengan kain pembungkus.
2. Minta temanmu menebak benda dengan menyentuh (kulit) atau mencium baunya (hidung).
3. Catat benda apa saja yang berhasil ditebak!',
  '1. Sebutkan fungsi dari lidah dan kulit!
2. Indra apakah yang digunakan untuk mencium wangi bunga?
3. Tuliskan 2 cara merawat kesehatan mata agar tidak mudah rusak!',
  '["Membuat gambar skema panca indra dan mempresentasikannya di depan kelas."]'::jsonb,
  '["Mencocokkan gambar organ panca indra dengan fungsinya."]'::jsonb,
  '["Buku IPAS SD/MI Kelas 1 Kurikulum Merdeka."]'::jsonb,
  true
),
-- 8. Pendidikan Pancasila - Simbol Pancasila (Fase A)
(
  'a1b2c3d4-0008-4000-8000-000000000008',
  'pendidikan pancasila',
  'simbol pancasila',
  'A',
  '["Peserta didik dapat mengenali simbol-simbol sila Pancasila pada lambang negara Garuda Pancasila.","Peserta didik menceritakan hubungan antara simbol dan sila-sila Pancasila."]'::jsonb,
  '["Pancasila adalah dasar negara yang menjadi pedoman persatuan dan kebaikan hidup bangsa Indonesia."]'::jsonb,
  '["Ada berapa sila dalam Pancasila? Apa simbol sila pertama?","Mengapa terdapat lambang pohon beringin dan rantai pada dada burung Garuda?"]'::jsonb,
  'Menempel Lambang Garuda:
1. Gunting gambar 5 simbol Pancasila.
2. Tempelkan simbol tersebut pada posisi perisai Garuda Pancasila yang tepat.
3. Tuliskan bunyi silanya di samping gambar!',
  '1. Apakah bunyi sila pertama Pancasila dan apa simbolnya?
2. Simbol berupa rantai mas melambangkan sila ke-...?
3. Sebutkan contoh sikap di rumah yang sesuai dengan sila ketiga!',
  '["Membuat puzzle burung Garuda dan menghafal 5 sila Pancasila dengan intonasi tepat."]'::jsonb,
  '["Mewarnai gambar perisai Pancasila dan menyebutkan bunyinya secara lisan."]'::jsonb,
  '["Buku Siswa Pendidikan Pancasila Kelas 1 Kemendikbudristek."]'::jsonb,
  true
),
-- 9. Pendidikan Pancasila - Musyawarah (Fase B)
(
  'a1b2c3d4-0009-4000-8000-000000000009',
  'pendidikan pancasila',
  'musyawarah',
  'B',
  '["Peserta didik dapat menjelaskan arti dan pentingnya musyawarah dalam mengambil keputusan bersama.","Peserta didik dapat mensimulasikan musyawarah kelas dengan sikap saling menghargai pendapat."]'::jsonb,
  '["Musyawarah mufakat melatih kita bersikap demokratis, tidak memaksakan kehendak, dan menjaga kerukunan."]'::jsonb,
  '["Bagaimana cara menentukan ketua kelas jika ada beberapa calon yang sama-sama bagus?","Apa yang harus kita lakukan jika pendapat kita tidak terpilih saat musyawarah?"]'::jsonb,
  'Simulasi Musyawarah Kelas:
1. Pilihlah topik tujuan wisata edukasi kelas.
2. Lakukan musyawarah untuk menentukan kesepakatan bersama.
3. Catat jalannya musyawarah dan keputusan akhir yang disepakati!',
  '1. Musyawarah merupakan pengalaman Pancasila sila ke-...?
2. Tuliskan 3 adab yang baik saat menyampaikan pendapat dalam musyawarah!
3. Apakah yang dimaksud dengan keputusan mufakat?',
  '["Menulis narasi pengalaman musyawarah di lingkungan tempat tinggal/RT."]'::jsonb,
  '["Bimbingan mempraktikkan cara mengacungkan tangan dan bicara santun dalam kelompok."]'::jsonb,
  '["Buku Buku Pendidikan Pancasila SD Kelas 4."]'::jsonb,
  true
),
-- 10. Akidah Akhlak - Asmaul Husna (Fase A)
(
  'a1b2c3d4-0010-4000-8000-000000000010',
  'akidah akhlak',
  'asmaul husna',
  'A',
  '["Peserta didik mampu mengenal arti Asmaul Husna (Ar-Rahman, Ar-Rahim, Al-Hafiz).","Peserta didik dapat mengimplementasikan sikap kasih sayang dan menjaga kebersihan dalam kehidupan sehari-hari."]'::jsonb,
  '["Mengenal Asmaul Husna menumbuhkan rasa cinta yang mendalam kepada Allah Swt. dan dorongan berbuat baik kepada sesama."]'::jsonb,
  '["Apakah arti dari Ar-Rahman dan Ar-Rahim?","Bagaimana cara kita meneladani sifat kasih sayang Allah kepada teman?"]'::jsonb,
  'Kaligrafi dan Refleksi Cinta:
1. Warnailah kaligrafi Asmaul Husna "Ar-Rahman".
2. Tuliskan 2 perbuatan kasih sayang yang sudah kamu lakukan hari ini kepada teman/orang tua!',
  '1. Sebutkan arti dari Ar-Rahman!
2. Jika ada teman yang jatuh dari sepeda, sikap apa yang mencerminkan rasa kasih sayang?
3. Sebutkan 3 Asmaul Husna yang telah kamu hafalkan beserta artinya!',
  '["Menghafalkan 10 Asmaul Husna beserta artinya melalui lantunan lagu indah."]'::jsonb,
  '["Bimbingan membaca dan mengulang hafalan Ar-Rahman & Ar-Rahim."]'::jsonb,
  '["Buku Akidah Akhlak MI Kelas 1 Kemenag RI."]'::jsonb,
  true
),
-- 11. Al-Qur'an Hadis - Surah Pendek (Fase A)
(
  'a1b2c3d4-0011-4000-8000-000000000011',
  'al-qur\'an hadis',
  'surah pendek',
  'A',
  '["Peserta didik dapat membaca surah Al-Fatihah dan Al-Ikhlas dengan tartil dan makhraj yang benar.","Peserta didik memahami kandungan pesan pokok surah Al-Ikhlas tentang keesaan Allah."]'::jsonb,
  '["Membaca Al-Qur'an mendapat pahala melimpah dan menentramkan hati kita."]'::jsonb,
  '["Mengapa kita selalu membaca surah Al-Fatihah setiap rakaat shalat?","Apa pesan utama dari surah Al-Ikhlas?"]'::jsonb,
  'Simak Bacaan Pasangan (Pair Reading):
1. Duduk berpasangan dengan teman sebangku.
2. Bergantian membaca Surah Al-Ikhlas ayat 1-4.
3. Koreksi jika ada makhraj atau tajwid teman yang keliru!',
  '1. Ada berapa ayat dalam surah Al-Ikhlas?
2. Tuliskan arti dari ayat "Qul huwallahu ahad"!
3. Sebutkan nama surah yang dinamakan Umul Qur'an (induk Al-Qur'an)!',
  '["Menghafal beserta terjemahan surah Al-Nas dan Al-Falaq."]'::jsonb,
  '["Bimbingan talaqqi mendengarkan dan menirukan bacaan guru ayat demi ayat."]'::jsonb,
  '["Buku Al-Qur'an Hadis MI Kelas 1 Kemenag RI."]'::jsonb,
  true
),
-- 12. Fikih - Shalat Fardhu (Fase B)
(
  'a1b2c3d4-0012-4000-8000-000000000012',
  'fikih',
  'shalat fardhu',
  'B',
  '["Peserta didik dapat menyebutkan nama-nama shalat fardhu 5 waktu beserta jumlah rakaatnya.","Peserta didik mampu mendemonstrasikan gerakan dan rukun shalat fardhu secara tertib."]'::jsonb,
  '["Shalat adalah tiang agama dan sarana utama berinteraksi serta memohon petunjuk kepada Allah Swt."]'::jsonb,
  '["Sebutkan nama 5 shalat wajib! Berapa jumlah rakaat shalat Dzuhur dan Maghrib?","Mengapa kita harus tuma\'ninah saat ruku\' dan sujud?"]'::jsonb,
  'Praktik Gerakan Shalat:
1. Praktikkan gerakan takbiratul ihram, ruku\', i\'tidal, dan sujud bersama kelompok.
2. Amati dan pastikan rukun tuma\'ninah dilakukan dengan sempurna.
3. Catat urutan gerakan shalat dari awal sampai salam!',
  '1. Sebutkan nama shalat wajib yang jumlah rakaatnya 3!
2. Apakah yang dimaksud dengan tuma\'ninah dalam shalat?
3. Sebutkan 3 hal yang membatalkan shalat!',
  '["Menuliskan bacaan niat dan doa tasyahud akhir beserta artinya."]'::jsonb,
  '["Bimbingan peragaan gerakan shalat satu persatu di musala sekolah."]'::jsonb,
  '["Buku Fikih MI Kelas 3 Kemenag RI."]'::jsonb,
  true
),
-- 13. Bahasa Inggris - Greetings and Introduction (Fase A)
(
  'a1b2c3d4-0013-4000-8000-000000000013',
  'bahasa inggris',
  'greetings',
  'A',
  '["Students can greet others using simple expressions (Good morning, Hello, How are you).","Students can introduce their name and age confidently in English."]'::jsonb,
  '["Greeting and introducing ourselves helps us build friendship with people around the world."]'::jsonb,
  '["How do you say \'Selamat Pagi\' in English?","What do you say when someone asks \'What is your name?\'?"]'::jsonb,
  'Roleplay Speaking Activity:
1. Pair up with your friend.
2. Practice the dialogue: "Hello! My name is [Name]. Nice to meet you!"
3. Perform the short conversation in front of the class!',
  '1. Complete the sentence: "Good ________, Teacher!" (Selamat pagi)
2. What is the response to "How are you?" -> "I am ________, thank you."
3. Translate to English: "Nama saya adalah Ani"!',
  '["Write a short introduction paragraph including favorite color and hobby."]'::jsonb,
  '["Guided repetition of greeting phrases with flashcards."]'::jsonb,
  '["My Next Words Grade 1 Student Book Kemendikbudristek."]'::jsonb,
  true
),
-- 14. Bahasa Jawa - Unggah Ungguh Basa (Fase B)
(
  'a1b2c3d4-0014-4000-8000-000000000014',
  'bahasa jawa',
  'unggah ungguh basa',
  'B',
  '["Peserta didik dapat membedakan penggunaan basa ngoko dan basa krama lugu/inggil.","Peserta didik mampu mempraktikkan pacelathon (percakapan) santun marang wong tuwa/guru."]'::jsonb,
  '["Unggah-ungguh basa Jawa mengajarake adab, kurmat, lan sopan santun marang sesami."]'::jsonb,
  '["Basa apa sing digunakake nalika guneman karo bapak ibu guru?","Apa bedane tembung \'turu\' karo \'sare\'?"]'::jsonb,
  'Praktik Pacelathon Santun:
1. Wacanen pacelathon antarane murid lan guru ing lembar kerja.
2. Paragakno pacelathon kasebut karo kancamu ing ngarep kelas.
3. Owahana tembung ngoko dadi krama inggil sing tepat!',
  '1. Basa kramane "mangan" yaiku ...
2. Basa kramane "turu" kanggo wong tuwa yaiku ...
3. Salin ukara iki dadi basa krama: "Ibu lagi lunga menyang pasar"!',
  '["Nulis teks pacelathon ringkes nggunakake basa krama alus."]'::jsonb,
  '["Gladhen ngucapake tembung-tembung krama inggil dhasar."]'::jsonb,
  '["Buku Rembulan Basa Jawa Kelas 4 SD/MI."]'::jsonb,
  true
),
-- 15. TIK - Pengenalan Komputer (Fase B)
(
  'a1b2c3d4-0015-4000-8000-000000000015',
  'tik',
  'pengenalan komputer',
  'B',
  '["Peserta didik dapat mengidentifikasi perangkat keras komputer (Monitor, CPU, Keyboard, Mouse).","Peserta didik dapat mengoperasikan langkah menghidupkan dan mematikan komputer sesuai prosedur."]'::jsonb,
  '["Teknologi komputer mempermudah pekerjaan manusia dan membuka wawasan informasi global secara bijak."]'::jsonb,
  '["Perangkat mana yang digunakan untuk mengetik angka dan huruf?","Mengapa kita tidak boleh mematikan komputer dengan mencabut kabel listrik secara langsung?"]'::jsonb,
  'Eksplorasi Perangkat Komputer:
1. Amati unit komputer di laboratorium TIK.
2. Tunjukkan dan sebutkan nama masing-masing perangkat kerasnya.
3. Praktikkan cara memegang mouse yang benar dan mengklik tombol shutdown!',
  '1. Apakah fungsi dari Keyboard?
2. Sebutkan nama perangkat keras yang berfungsi sebagai otak komputer!
3. Tuliskan 3 urutan langkah mematikan komputer secara aman!',
  '["Mengenal tombol tombol khusus keyboard seperti Enter, Spacebar, Backspace, dan Shift."]'::jsonb,
  '["Bimbingan memegang mouse dan mengklik ikon di desktop."]'::jsonb,
  '["Buku Modul TIK SD/MI Informatika."]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  mata_pelajaran = EXCLUDED.mata_pelajaran,
  topik = EXCLUDED.topik,
  fase = EXCLUDED.fase,
  tujuan_pembelajaran = EXCLUDED.tujuan_pembelajaran,
  pemahaman_bermakna = EXCLUDED.pemahaman_bermakna,
  pertanyaan_pemantik = EXCLUDED.pertanyaan_pemantik,
  lkpd_tugas = EXCLUDED.lkpd_tugas,
  soal_evaluasi = EXCLUDED.soal_evaluasi,
  pengayaan = EXCLUDED.pengayaan,
  remedial = EXCLUDED.remedial,
  daftar_pustaka = EXCLUDED.daftar_pustaka,
  is_verified = EXCLUDED.is_verified;

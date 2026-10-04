# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-09-28

### Added (Apa yang baru)
- **Jendela "Apa yang baru" saat ada versi baru:** guru melihat daftar perubahan lalu memilih **Perbarui sekarang** atau **Nanti**. Hitung mundur muat ulang otomatis 3 detik dihapus. Kalau aplikasi diperbarui di latar belakang, daftar perubahan muncul sekali saat aplikasi dibuka lagi. Isinya diambil dari `public/release-notes.json` (panduan: `docs/release-notes.md`). Portal Orang Tua dan halaman login tetap diperbarui otomatis tanpa jendela ini.
- **Pengingat catatan rilis sebelum push:** hook `.githooks/pre-push` memperingatkan saat push ke `main` mengubah aplikasi tanpa memperbarui `public/release-notes.json`. Aktifkan sekali per clone dengan `git config core.hooksPath .githooks`.

### Security
- **Hardening database Supabase** (rincian: `docs/DB_HARDENING_PLAN_2026-10-03.md`):
  - Pengunjung tanpa login tidak lagi bisa memanggil 33 fungsi SECURITY DEFINER, termasuk `get_student_directory` yang sebelumnya membocorkan nama semua siswa. RPC Portal Orang Tua tetap berjalan.
  - Fungsi khusus server (notifikasi push, backup, konfigurasi worker AI, sinkronisasi peran, fungsi debug) kini hanya bisa dipanggil `service_role`, cron, dan trigger.
  - Akses ke RPC nilai yang rusak dan tidak dipakai (`bulk_insert_grades`, `update_grade_with_version`, `apply_quiz_points_to_grade`) dicabut. Fungsinya tidak dihapus.
  - `search_path` dikunci pada 24 fungsi, dan 43 foreign key diberi index.
  - Snapshot izin untuk rollback: `supabase/rollback/2026-10-03_function_acl_snapshot.sql`.
- **Notifikasi push orang tua (`dispatch-push`):**
  - Edge function kini mewajibkan secret internal atau service role key. Sebelumnya siapa pun bisa mengirim notifikasi berisi teks bebas ke orang tua.
  - `_shared/web-push.ts` ditulis ulang sesuai RFC 8291 (enkripsi `aes128gcm`) dan RFC 8292 (VAPID). Implementasi lama gagal mengimpor kunci privat dan memakai format enkripsi yang salah, sehingga tidak ada notifikasi yang pernah terkirim. Tes baru mereproduksi vektor resmi RFC 8291.
  - Notifikasi kini disimpan layanan push hingga 24 jam (sebelumnya 60 detik) agar tetap sampai ke HP orang tua yang sedang offline.
  - Pasangan kunci VAPID baru dipasang di Supabase (4 Oktober 2026), karena kunci privat lama tidak ditemukan. `VAPID_SUBJECT` memakai domain produksi. Frontend perlu `VITE_VAPID_PUBLIC_KEY` baru di Vercel.
  - Browser yang masih berlangganan dengan kunci lama otomatis pindah ke kunci baru saat pengguna membuka aplikasi, dan langganan lamanya ditandai tidak aktif.
- **Absensi:**
  - Absensi yang sudah direset kini bisa disimpan ulang. Sebelumnya simpan selalu gagal "duplicate key", karena unique index `(student_id, date)` ikut menghitung baris yang sudah dihapus. Simpan kini memakai konflik pada `(student_id, date)`, sehingga dua guru yang menyimpan kelas dan tanggal yang sama juga tidak bentrok lagi.
  - Absensi tidak bisa disimpan di hari Minggu, kecuali semua siswa ditandai Libur.
  - Isi-otomatis mingguan melewati hari yang mayoritas sudah ditandai Libur di seluruh sekolah.
  - Notifikasi push absensi hanya dikirim untuk input guru hari ini/kemarin; isi-otomatis, Libur, dan koreksi tanggal lama tidak lagi dikirim ke orang tua.
  - 170 baris absensi 13–14 Juli yang tidak punya semester sudah diperbaiki.
- **Input Penilaian:**
  - Poin keaktifan: satu poin per siswa, aktivitas, mapel, dan hari, siapa pun gurunya (tidak peka huruf besar/kecil). Aturan ini kini sama di input massal, detail siswa, dan Program Bintang, sehingga poin tidak lagi tersimpan lalu diam-diam tidak dihitung.
  - Penjaga duplikat pelanggaran tidak lagi bergantung pada semester aktif.
  - Database menolak poin keaktifan baru yang melebihi `max_points` (data lama tidak diubah).
  - Semester 2 data pelanggaran lama disesuaikan dengan tanggalnya.
- **Program Bintang:**
  - Rapor draft yang dibuat sebelum ada pelanggaran atau poin keaktifan baru ditandai "Perlu diperbarui", dan muncul banner di atas tombol Generate.
  - Catatan wali kelas memakai kata sesuai jenis kelamin siswa (sholeh/sholehah, muslim/muslimah, peci/jilbab).
  - Rapor terbit hanya bisa dibaca evaluator, pimpinan, wali kelas, guru yang mengajar di kelas siswa, dan pembuat data siswa. Sebelumnya semua akun yang login bisa membacanya.
- Cron `modul-ajar-ai-worker-poll` dinonaktifkan. Antreannya tidak dipakai lagi oleh halaman Modul Ajar, dan cron ini ditolak 401 setiap 2 menit.

### Added
- **Ekspor Dokumen Modul Ajar lewat Server (di balik flag `VITE_ENABLE_SERVER_DOCUMENT_EXPORT`):**
  - Endpoint `POST /api/document-export/pdf` (Chromium headless) dan `POST /api/document-export/docx` (Word `.docx` asli) yang membaca dokumen tersimpan berdasarkan `lessonPlanId`, dengan verifikasi sesi, cek kepemilikan, rate limit, timeout, dan audit log.
  - Model ekspor bersama `src/lib/modulAjarExport` untuk PDF dan Word: dukungan A4/F4, margin 2 cm, header tabel berulang, baris tabel dan blok tanda tangan tidak terbelah, nomor halaman, serta varian LKPD siswa.
  - Status loading per tombol, dialog **Simpan & Unduh** untuk perubahan pratinjau yang belum disimpan, dan pesan gagal dengan **Coba lagi** serta **Cetak lewat browser**.
  - Dokumentasi: `docs/modul-ajar-ekspor-dokumen.md`.
- **Modul Perangkat Ajar (Prota & Promes):**
  - Implementasi penuh Program Tahunan (Prota) dan Program Semester (Promes) berbasis Kurikulum Merdeka & Kurikulum 2013.
  - Wizard generator otomatis untuk kalkulasi jam pelajaran tahunan dan semesteran dengan panduan interaktif.
  - Engine matriks kalender pendidikan (Kaldik) 30 pekan (6 bulan × 5 pekan) dengan deteksi otomatis pekan efektif (KBM) vs non-efektif (libur semester, jeda tengah semester, asesmen madrasah).
  - Presets kurikulum dan data default untuk Madrasah Ibtidaiyah (`defaultProtaPresets.ts`, `defaultKaldikPresets.ts`).
- **Engine Ekspor PDF Vektor Native (`protaPdfExport.ts` & `promesPdfExport.ts`):**
  - Pembuatan generator PDF programatik berbasis `jsPDF` + `jspdf-autotable` murni (menggantikan tangkapan layar `html2canvas`).
  - Header resmi Kop Surat Kementerian Agama & Madrasah Ibtidaiyah (`addOfficialMadrasahKop`) dengan logo ganda (Madrasah & Kemenag) serta garis ganda (*double rule border*).
  - Garansi cetak tepat 1 lembar A4 Landscape (1/1) tanpa halaman kosong kedua (*zero blank page*).
  - Blok tanda tangan ganda resmi (Kepala Madrasah di kiri, Guru Mata Pelajaran di kanan) yang selalu terikat di bawah tabel.
- **Ekspor Dokumen Office:**
  - Ekspor Prota & Promes ke Microsoft Word (`.docx`) menggunakan generator tabel formal `docx`.
  - Ekspor Prota & Promes ke Microsoft Excel (`.xlsx`) lengkap dengan sel styling, merger header, dan proteksi formula.
- **Pengujian Komprehensif:**
  - Penambahan 88 pengujian unit otomatis (`protaPdfExport.test.ts`, `promesPdfExport.test.ts`, `previewTab.test.tsx`, `exportPerangkatAjar.test.ts`, `kaldik.test.ts`, `prota.test.ts`, `promes.test.ts`).

### Changed
- **Penyempurnaan Tata Letak Ekspor Promes:**
  - Merapatkan jarak kolom Tujuan Pembelajaran (56 mm) dan Materi Pokok (34 mm) agar tidak membuang ruang horizontal kosong.
  - Menyesuaikan lebar kolom kalender 30 pekan menjadi 4.7 mm per pekan agar teks header bulan (`JANUARI` s.d. `JUNI`) dan penomoran pekan tampak lega dan proporsional.
  - Menetapkan margin kertas standar aman 12.5 mm kiri/kanan agar dokumen tidak menempel ke batas fisik kertas.
- **Penyempurnaan Spacing Judul Dokumen:**
  - Penambahan *safe vertical buffer* (+6.5 mm) di bawah garis pembatas Kop Surat untuk mengeliminasi tabrakan antara dasar garis ganda dan huruf kapital judul dokumen.

### Fixed
- **Input Penilaian** (temuan audit `docs/audit-input-penilaian-2026-10-04.md`):
  - Semester yang dipilih guru tidak lagi ditimpa trigger. `set_academic_record_semester_id()` dan `set_quiz_point_semester_id()` kini mempertahankan semester yang dikirim; poin tanpa semester ditentukan dari `quiz_date` (migrasi `20261004104503`, diterapkan 4 Oktober). Formulir nilai menolak menyimpan ke semester yang sudah dikunci, dan poin keaktifan/sikap memakai semester sesuai tanggalnya.
  - Draf nilai disimpan per akun dan per kelas–mapel–penilaian–semester (`src/utils/subjectGradeDraftStorage.ts`), dihapus saat logout, dan tidak lagi tertimpa nilai dari database saat halaman dibuka kembali. Banner draf menawarkan **Buang draf**.
  - Ganti kelas, semester, mapel, atau nama penilaian saat ada nilai belum disimpan kini selalu meminta konfirmasi. Nilai yang sudah diketik tetap menjadi draf dan muncul lagi saat guru kembali ke penilaian itu. Nama mapel/penilaian baru diterapkan setelah selesai diketik, bukan per huruf.
  - Simpan hanya mengirim nilai yang berubah, membaca nilai terbaru sebelum menulis, dan menampilkan dialog konflik bila nilai yang sama sudah diubah dari perangkat lain. Unique index `uq_academic_records_live_assessment` mencegah dua baris nilai untuk penilaian yang sama (migrasi `20261004104508`, diterapkan 4 Oktober).
  - Rapor massal dan rekap nilai mengambil data per halaman (`src/utils/fetchAllPages.ts`), sehingga absensi lebih dari 1.000 baris tidak lagi terpotong. Ekspor gagal dengan pesan jelas bila data tidak terambil lengkap.
  - Simpan sikap memeriksa error rekap `attitude_records`, memperbarui baris yang sudah ada alih-alih menabrak unique index, menyimpan catatan, dan menampilkan peringatan bila rekap gagal.
  - Tanggal awal keaktifan, sikap, dan pelanggaran memakai tanggal WIB (`schoolDate()`), tidak lagi tanggal UTC sebelum pukul 07.00.
- **Rapor Bintang:**
  - Portal Orang Tua kini bisa menampilkan rapor Bintang yang sudah terbit, lewat RPC baru `get_student_portal_bintang` yang memvalidasi kode akses (migrasi `20261003132636`).
  - Isi rapor yang sudah terbit dikunci di database dengan trigger `trg_lock_published_bintang_eval` (migrasi `20261003132628`). Untuk mengedit, batalkan publikasi dulu. Tombol Generate kini melewati rapor yang sudah terbit.
  - Nilai yang tidak diubah manual sekarang ikut diperbarui saat Generate, jadi pelanggaran yang dicatat setelah Generate pertama tetap terhitung.
  - Catatan wali kelas dan catatan aspek yang diedit guru tidak lagi tertimpa saat Generate, walaupun teksnya diawali kalimat template.
  - Kalau data gagal dimuat, dashboard menampilkan peringatan dan menonaktifkan Generate serta Publikasi, supaya data yang gagal dimuat tidak dibaca sebagai nilai A. Respons lama saat kelas atau bulan diganti juga diabaikan.
  - Konfirmasi Publikasi kini menyebut jumlah siswa yang belum punya rapor.
  - Grafik tren kini memakai poin bersih (setelah potongan poin keaktifan), sehingga tinggi grafik sesuai dengan nilai huruf yang tampil.
  - Deskripsi pelanggaran yang kosong atau terlalu pendek tidak lagi dicocokkan ke aspek sembarangan. Catatan wali kelas juga memakai pencocokan aspek yang sama dengan perhitungan nilai.
  - Siswa yang punya nilai D tidak lagi mendapat kalimat pembuka pujian keaktifan di catatan wali kelas.
  - Predikat sikap (KI-1/KI-2) di rapor dan PDF diambil dari semester bulan rapor, bukan dari data sikap terbaru.
  - Tanggal bawaan pada form pembinaan, observasi, dan poin keaktifan kini memakai tanggal lokal (WIB), bukan UTC.
  - Pelanggaran per siswa kini dideduplikasi seperti tampilan per kelas.
  - Tes `bintangViolationDiagnosis` tidak lagi mengirim INSERT ke Supabase produksi, dan Vitest mengabaikan folder `.delta/`.
- **Word Export Platform Error:** Memperbaiki galat `Error: nodebuffer is not supported by this platform` pada browser dengan beralih dari `Packer.toBuffer()` ke `Packer.toBlob()`.
- **Excel Download Cancellation:** Memperbaiki pembatalan unduhan otomatis di browser Chromium melalui penundaan pelepasan Blob URL (`setTimeout(revokeObjectURL, 1500)`).
- **Halaman 2 Kosong pada PDF:** Mengeliminasi halaman kedua kosong yang dipicu oleh pemotongan kanvas raster `html2canvas` dengan beralih ke layout vektor `autoTable` dengan `pageBreak: 'avoid'`.
- **Kop Surat Terpotong:** Menghilangkan cacat potongan atas logo Kop Surat dengan menggunakan injeksi logo base64 langsung ke koordinat PDF terukur.

---

## [1.2.0] - 2026-09-27

### Added
- **Manajemen Jadwal Penilaian Harian (PH):**
  - Tab jadwal PH terintegrasi pada modul Jadwal Mengajar (`PhScheduleTab.tsx`).
  - Modal formulir jadwal PH (`PhScheduleFormModal.tsx`) dan tampilan mingguan (`PhWeeklyScheduleView.tsx`).
  - Widget agenda PH hari ini pada Dashboard Guru (`TodayPhScheduleWidget.tsx`).
- **Dikte Nilai Berbasis Suara (Voice Grade Input):**
  - Dukungan pengenalan ucapan (*Web Speech API*) untuk penginputan nilai harian siswa secara cepat dan hands-free.

### Changed
- Modernisasi antarmuka UI/UX Pro Max menyeluruh dengan standar aksesibilitas WCAG 2.2 AA di seluruh modul.
- Optimalisasi palet warna formal tema madrasah bernuansa Emerald & Slate.

### Performance
- Memoisasi komponen daftar siswa untuk mencegah *layout thrashing* pada peranti seluler dan laptop berspesifikasi rendah.
- Implementasi kunci pencegah klik ganda (*double-submission lock*) pada mutasi data nilai dan presensi.

---

## [1.1.0] - 2026-09-20

### Added
- **Modul Bintang Kebaikan & Karakter:**
  - Sistem pencatatan poin perilaku positif dan penanganan pelanggaran siswa terstruktur.
  - Generator laporan rekapitulasi poin karakter berformat PDF lengkap dengan kode verifikasi QR.
- **Penyempurnaan Input Nilai Massal (Mass Input):**
  - Validasi batas KKM otoritatif dan perlindungan dari kehilangan draf nilai yang belum tersimpan.
  - Dukungan ekspor kisi-kisi lembar penilaian massal ke format PDF dan Excel.

### Fixed
- Pencegahan duplikasi data catatan pelanggaran siswa melalui pemeriksaan idempotensi Supabase.
- Penguatan integrasi *Soft Delete Service* untuk pemulihan data siswa yang tidak sengaja terhapus.

---

## [1.0.0] - 2026-09-01

### Added
- Rilis perdana **Portal Guru — Manajemen Kelas & Siswa Madrasah**:
  - **Dashboard Guru:** Ringkasan agenda mengajar harian, kartu statistik absensi, dan notifikasi jadwal kelas.
  - **Jurnal Mengajar:** Pencatatan agenda materi harian, kehadiran, refleksi guru, dan rekapitulasi format Kemendikbud/Kemenag.
  - **Presensi Siswa:** Absensi harian dan bulanan dengan matriks ekspor 31 hari A4 Landscape.
  - **Rapor Siswa:** Generator lembar hasil belajar siswa dengan perhitungan predikat otomatis (A-E) dan cetak raport PDF.
  - **Jadwal Mengajar:** Penyusunan jadwal tatap muka mingguan terstruktur per hari dan jam pelajaran.

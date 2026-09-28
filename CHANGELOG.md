# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-09-28

### Added
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

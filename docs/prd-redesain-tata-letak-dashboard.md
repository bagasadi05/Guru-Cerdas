# PRD: Redesain & Penataan Ulang Tata Letak Dashboard (Section Performa & Widget Kehadiran)

> **Status:** Draft / Proposed  
> **Tanggal:** 2026-09-05  
> **Penanggung Jawab:** Tim Pengembang & Desain UI/UX Guru Cerdas  
> **Target Sprint:** Sprint 11 (Q4 2026)  
> **Dokumen Terkait:** `docs/prd-dashboard-improve.md`, `docs/DESIGN_SYSTEM.md`, `docs/DESIGN_STANDARDS.md`

---

## 1. Latar Belakang & Analisis Masalah

Dashboard (`/dashboard`) adalah beranda operasional harian bagi guru dan administrator MI Al Irsyad Madiun. Pada rilis terkini (Section 3: *Performa Kelas & Siswa*), terdapat dua widget utama yang diletakkan bersisian dalam layout grid 2-kolom:
1. **Kolom Kiri:** `AttendanceStatsWidget` (Statistik Kehadiran Harian & Tren Mingguan).
2. **Kolom Kanan:** `ClassAnalyticsSection` (Analisis Nilai & Kehadiran Lintas Kelas).

Berdasarkan audit visual dan pedoman heuristik UI/UX modern (Nielsen Norman Group, Fitts's Law, dan Gestalt Heuristics), ditemukan sejumlah ketidakseimbangan tata letak dan inefisiensi kognitif yang mengurangi kenyamanan pengguna.

---

### 1.1. Peta Masalah Saat Ini

| # | Masalah UI/UX | Dampak bagi Pengguna | Tingkat Keparahan | Heuristik yang Dilanggar |
|---|---------------|----------------------|-------------------|--------------------------|
| 1 | **Asimetri Tinggi Kolom (*Height Mismatch*)** | Kartu kanan memanjang tanpa batas (menampilkan semua kelas: 1A s.d. 3B+), sedangkan kartu kiri pendek. Ini menciptakan ruang kosong raksasa (*dead space*) di kolom kiri atau scroll vertikal yang melelahkan. | **Tinggi (P0)** | *Aesthetic and Minimalist Design* |
| 2 | **Redundansi Data Absensi Kelas** | Informasi kehadiran per kelas ditampilkan dua kali bersisian: sub-seksi "PER KELAS" di kartu kiri dan daftar kelas di kartu kanan. Guru bingung memilih sumber acuan. | **Tinggi (P1)** | *Consistency and Standards / Recognition over Recall* |
| 3 | **Ambiguitas Metrik di Kolom Kanan** | Label baris hanya bertuliskan "Rata-rata" (tanpa keterangan rata-rata apa) bertumpuk dengan "Kehadiran". Nilai `78` dan `0%` bertumpuk di kanan tanpa pemisah visual yang jelas. | **Sedang (P1)** | *Visibility of System Status* |
| 4 | **Kurangnya Presisi Data pada Tren Mingguan** | Grafik batang (Sel–Sab) di kartu kiri menampilkan balok hijau tanpa angka persentase capaian dan tanpa sumbu Y, sehingga data tidak informatif. | **Sedang (P2)** | *Visibility of System Status* |
| 5 | **Bug Aliran Data Absensi (`attendanceRecords={[]}`)** | Komponen `LazyClassAnalyticsSection` di `DashboardPage.tsx` di-pass `attendanceRecords={[]}` statis, menyebabkan tingkat kehadiran semua kelas selalu bernilai `0%`. | **Kritis (P0)** | *System Integrity / Accuracy* |
| 6 | **Redundansi Avatar & Kepadatan Top Bar** | Avatar pengguna muncul ganda (di sidebar kiri profil dan pojok kanan atas top bar), serta deretan 7 ikon/tombol di header yang terlalu padat di layar laptop standar. | **Rendah (P2)** | *Law of Parsimony / Visual Clutter* |

---

## 2. Tujuan & Sasaran Perbaikan

1. **Keseimbangan Visual (Visual Balance & Symmetry):** Kolom kiri dan kanan memiliki proporsi tinggi yang selaras pada viewport desktop tanpa meninggalkan ruang kosong canggung.
2. **Eliminasi Redundansi (Single Source of Truth):** Menghilangkan duplikasi tampilan kehadiran per kelas sehingga tiap widget memiliki fungsi yang terdefinisi tegas.
3. **Kejelasan Kognitif (Clarity & Readability):** Memberikan penamaan metrik yang eksplisit (*"Rata-rata Nilai"* vs *"Kehadiran"*) dengan indikator visual yang kontras dan mudah dipindai (*scannable*).
4. **Perbaikan Integritas Data:** Menghubungkan data absensi yang valid ke `ClassAnalyticsSection` agar persentase kehadiran mencerminkan data aktual.
5. **Ergonomi Layar Guru:** Memastikan dashboard tampil proporsional pada resolusi laptop sekolah populer (1366×768 dengan scaling 125% dan 1080p).

---

## 3. Pengguna Target

| Role | Kebutuhan Utama pada Sesi Ini |
|------|-------------------------------|
| **Guru Kelas / Mapel** | Melihat ringkasan absensi hari ini secara cepat, tren mingguan, dan perbandingan performa kelas yang diajar. |
| **Wali Kelas** | Memantau komparasi kehadiran dan nilai kelasnya terhadap kelas-kelas paralel lainnya tanpa scroll panjang. |
| **Kepala Madrasah & Admin** | Memperoleh gambaran umum (*executive overview*) kehadiran harian madrasah dan distribusi performa kelas dalam satu pandangan mata (*above the fold*). |

---

## 4. Spesifikasi Perubahan Teknis & Desain

### 4.1. Redesain `ClassAnalyticsSection.tsx` (Kolom Kanan)

* **Tab / Filter Jenjang Kelas:**
  * Tambahkan filter tingkat kelas di bagian header kartu:  
    `[Semua] [Kelas 1] [Kelas 2] [Kelas 3] [Kelas 4] [Kelas 5] [Kelas 6]`
  * Guru dapat menyaring hanya jenjang yang diinginkan, mereduksi daftar panjang menjadi 2–3 kelas per tampilan.
* **Kontainer Berbatas Tinggi dengan Scroll Halus:**
  * Tetapkan batas tinggi maksimum (`max-h-[460px]`) yang seimbang dengan tinggi kartu kiri.
  * Tambahkan `overflow-y-auto` dengan `custom-scrollbar` yang ramping agar daftar kelas banyak tetap dapat di-scroll tanpa merusak grid layout utama.
* **Penyempurnaan Label & Badge Metrik:**
  * Ubah teks generik `"Rata-rata"` menjadi **`"Nilai Rata-rata"`**.
  * Pisahkan tampilan nilai dan persentase dengan tata letak tag atau badge:
    * Tag Nilai: Latar aksen biru lembut, angka tebal (`78`).
    * Tag Kehadiran: Latar aksen emerald lembut, persentase tebal (`95%`).
  * Jika nilai belum ada / 0, tampilkan keterangan abu-abu lembut (`Belum ada nilai`) agar tidak memberi impresi nilai merah/gagal.
* **Koreksi Data Absensi:**
  * Di `DashboardPage.tsx`, salurkan `data.todayAttendanceRecords` atau ringkasan absensi yang relevan ke prop `attendanceRecords`, bukan array kosong `[]`.

---

### 4.2. Redesain `AttendanceStatsWidget.tsx` (Kolom Kiri)

* **Eliminasi Sub-Seksi "PER KELAS" yang Redundan:**
  * Hapus sub-daftar kelas yang ada di dalam `AttendanceStatsWidget` karena rincian per kelas sudah diwadahi secara lengkap dan lebih komparatif di kartu kanan (`ClassAnalyticsSection`).
* **Kompaktifikasi Kartu 4 Status (Hadir, Sakit, Izin, Alpha):**
  * Sesuaikan padding kartu (`p-3`), ukuran font angka (`text-2xl` bukan `text-3xl`), dan tata letak vertikal agar lebih proporsional dan hemat ruang.
* **Peningkatan Visualisasi "Tren Kehadiran Mingguan":**
  * Tampilkan persentase nilai kecil di atas balok (misal: `90%`, `95%`, `80%`) untuk kejelasan cepat.
  * Tambahkan tooltip interaktif pada hover/tap batang yang menampilkan: *Hari, Tanggal, Jumlah Hadir/Total Siswa, dan Persentase*.
  * Warnai balok hari ini dengan aksen khusus (misal: border hijau menyala atau glow) sebagai penanda hari aktif.

---

### 4.3. Penataan Header & Shell Actions (`ShellHeaderActions.tsx`)

* **Hilangkan Duplikasi Avatar Profil:**
  * Sembunyikan avatar profil bulat di pojok kanan atas pada breakpoint desktop (`hidden`) jika sidebar kiri dalam keadaan terbuka/terlihat, karena informasi pengguna (*Nama, Foto, Role*) sudah tampil lengkap di sidebar kiri.
* **Konsolidasi Indikator Status Sistem:**
  * Satukan status kualitas jaringan (`NetworkQualityIndicator`) dan status sinkronisasi (`EnhancedSyncStatus`) menjadi satu pill indikator ringkas:
    * Contoh: `[ ● Terhubung & Tersinkron ]` dengan tooltip detail saat diklik/hover.

---

### 4.4. Penataan Grid Layout (`DashboardPage.tsx`)

* **Grid Alignment:**
  * Pertahankan `grid grid-cols-1 lg:grid-cols-2 gap-4 items-start` (ubah dari `items-stretch` menjadi `items-start` agar jika ada perbedaan konten, kartu tidak tertarik secara tidak wajar).
* **Responsivitas:**
  * Desktop (≥ 1024px): 2 kolom seimbang berdampingan.
  * Tablet & Mobile (< 1024px): 1 kolom bertumpuk vertikal dengan urutan alami: Kehadiran Harian terlebih dahulu, diikuti Analisis Performa Kelas.

---

### 4.5. Spesifikasi Khusus Tampilan Mobile (*Thumb-First & Layar Sentuh*)

Mengacu pada pedoman desain repositori ([`MOBILE_AUDIT_THUMB_FIRST.md`](file:///d:/coding/Guru%20Cerdas/docs/MOBILE_AUDIT_THUMB_FIRST.md)), penataan di layar ponsel (< 640px / 375px) membutuhkan perlakuan khusus:

1. **Adaptasi Grid 4 Kartu Status Kehadiran:**
   * **Masalah:** Pada layar ponsel selebar 360–390px, membagi 4 kolom (`grid-cols-4`) membuat kartu terlalu sempit (~70px), sehingga angka besar dan label status rentan terpotong atau tertekan.
   * **Solusi:** Gunakan grid responsif `grid grid-cols-2 sm:grid-cols-4 gap-2.5`. Pada ponsel, kartu akan tersusun rapi menjadi matriks 2×2 dengan ukuran tap target yang nyaman dan angka yang terbaca jelas.
2. **Filter Jenjang Kelas Geser Horizontal (*Horizontal Scrollable Chips*):**
   * **Masalah:** Tombol filter kelas jika di-wrap ke bawah akan memakan 2–3 baris vertikal layar ponsel.
   * **Solusi:** Gunakan kontainer horizontal scrollable (`flex overflow-x-auto no-scrollbar gap-2 py-1 -mx-1 px-1`) dengan touch target tinggi minimal **44px** (`min-h-[44px]`). Guru cukup menggeser dengan ibu jari secara horizontal untuk memilih jenjang.
3. **Ergonomi Akordeon & Penghematan Layar Ponsel:**
   * **Masalah:** Jika `ClassAnalyticsSection` terbuka penuh di ponsel, guru harus men-scroll berkali-kali untuk melihat widget di bawahnya (seperti jadwal dan tugas).
   * **Solusi:** Pada layar mobile (`sm:hidden`), default state accordion dapat diatur lebih fleksibel atau tinggi kontainer dibatasi maksimal `max-h-[340px]`.
4. **Target Sentuh Grafik Tren Mingguan (*Thumb-Friendly Tap Area*):**
   * Pada mobile, balok grafik batang diberi area sentuh tak kasat mata (*invisible touch target padding*) minimal selebar **44px** per hari agar guru tidak kesulitan membuka tooltip rincian absensi saat mengetuk menggunakan jari.
5. **Jarak Aman Navigasi Bawah (*Bottom Navigation Safe Area*):**
   * Pastikan kontainer utama mempertahankan `pb-28` agar konten paling bawah kartu tidak tertutup oleh `EnhancedMobileBottomNav` dan FAB tombol aksi.

---

## 5. Perbandingan Wireframe (Sebelum vs Sesudah)

### 5.1. Tampilan Saat Ini (Bermasalah pada Desktop)
```text
┌───────────────────────────────────────┬───────────────────────────────────────┐
│ [📅] Statistik Kehadiran        [ 0% ]│ [📊] Analisis Kelas               [^] │
│      Sabtu, 5 September 2026          ├───────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │ • Kelas 1A (28 siswa)                 │
│ │  0  │ │  0  │ │  0  │ │  0  │       │   Rata-rata [        ] 0              │
│ │HADIR│ │SAKIT│ │IZIN │ │ALPHA│       │   Kehadiran [        ] 0%             │
│ └─────┘ └─────┘ └─────┘ └─────┘       │ • Kelas 1B (28 siswa)                 │
│                                       │   Rata-rata [        ] 0              │
│ PER KELAS                             │   Kehadiran [        ] 0%             │
│ Kelas 3A 0H 0S 0I 0A [====] 0%        │ • Kelas 1C (27 siswa) ...             │
│                                       │ • Kelas 2A (30 siswa) ...             │
│ Tren Kehadiran Mingguan               │ • Kelas 2B (29 siswa) ...             │
│  [■]   [■]   [■]   [■]   [ ]          │ • Kelas 2C (30 siswa) ...             │
│  Sel   Rab   Kam   Jum   Sab          │ • Kelas 3A (30 siswa) [===] 78 / 0%   │
│                                       │ • Kelas 3B (32 siswa) ...             │
│ [ AREA KOSONG / DEAD SPACE KIRI ]     │ [ KARTU KANAN MEMANJANG KE BAWAH ]    │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

### 5.2. Tampilan Baru Desktop yang Diusulkan (Proporsional & Rapi)
```text
┌───────────────────────────────────────┬───────────────────────────────────────┐
│ 📅 Statistik Kehadiran Harian   [ 0% ]│ 📊 Analisis Performa Kelas        [^] │
│    Sabtu, 5 September 2026            ├───────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │ Filter: [Semua] [Kls 1] [Kls 2] [Kls 3│
│ │  0  │ │  0  │ │  0  │ │  0  │       ├───────────────────────────────────────┤
│ │Hadir│ │Sakit│ │Izin │ │Alpha│       │ ┌─ Area Scroll Halus (max-h: 460px) ─┐│
│ └─────┘ └─────┘ └─────┘ └─────┘       │ │ • Kelas 3A (30 siswa)              ││
│                                       │ │   Nilai Rata-rata [=====] 78       ││
│ 📈 Tren Kehadiran (5 Hari Terakhir)   │ │   Kehadiran       [=====] 92%      ││
│   92%   94%   88%   90%   0%          │ │                                    ││
│  [■]   [■]   [■]   [■]   [ ]          │ │ • Kelas 3B (32 siswa)              ││
│  Sel   Rab   Kam   Jum   Sab*         │ │   Nilai Rata-rata [==== ] 74       ││
│  (*Hari ini)                          │ │   Kehadiran       [=====] 96%      ││
│                                       │ └────────────────────────────────────┘│
│                                       │ [●] Nilai Rata-rata    [●] Kehadiran  │
└───────────────────────────────────────┴───────────────────────────────────────┘
  (Kedua kartu memiliki tinggi seimbang, bebas redundansi, dan mudah dipindai)
```

### 5.3. Tampilan Baru Mobile yang Diusulkan (Layar 375px)
```text
┌───────────────────────────────────────┐
│ 📅 Statistik Kehadiran Harian  [ 0% ] │
│    Sabtu, 5 September 2026            │
│ ┌───────────────┬───────────────────┐ │
│ │  (✓) Hadir: 0 │  (▲) Sakit: 0     │ │  ← Matriks 2x2 di ponsel
│ ├───────────────┼───────────────────┤ │    (tidak terhimpit)
│ │  (👥) Izin: 0  │  (✕) Alpha: 0     │ │
│ └───────────────┴───────────────────┘ │
│                                       │
│ 📈 Tren Kehadiran (5 Hari)            │
│    92%   94%   88%   90%   0%         │
│   [■]   [■]   [■]   [■]   [ ]         │
│   Sel   Rab   Kam   Jum   Sab*        │
│   (Target sentuh tiap bar >= 44px)    │
└───────────────────────────────────────┘
                    ▼
┌───────────────────────────────────────┐
│ 📊 Analisis Performa Kelas        [^] │
├───────────────────────────────────────┤
│ [Semua] [Kls 1] [Kls 2] [Kls 3] ➔     │  ← Geser horizontal (thumb-scroll)
├───────────────────────────────────────┤
│ • Kelas 3A (30 siswa)                 │
│   Nilai Rata-rata [======] 78         │
│   Kehadiran       [======] 92%        │
│                                       │
│ • Kelas 3B (32 siswa)                 │
│   Nilai Rata-rata [===== ] 74         │
│   Kehadiran       [======] 96%        │
│                                       │
│ (Max tinggi 340px + scroll internal)  │
└───────────────────────────────────────┘
```

---

## 6. Kriteria Keberterimaan (Acceptance Criteria)

### Modul A: `ClassAnalyticsSection.tsx`
- [ ] Tersedia filter tingkat kelas (`Semua`, `Kelas 1`, `Kelas 2`, dst.) yang berfungsi menyaring item kelas secara reaktif.
- [ ] Kontainer kelas memiliki batas tinggi maksimum yang konsisten dan scrollbar internal yang halus (*custom scrollbar*).
- [ ] Label baris diperbarui menjadi `"Nilai Rata-rata"` dan `"Kehadiran"`.
- [ ] Angka nilai dan persentase kehadiran disajikan dengan visual badge/tag yang jelas dan tidak bertumpuk membingungkan.
- [ ] Menggunakan data kehadiran riil dari `DashboardPage` (bukan array kosong `[]`).

### Modul B: `AttendanceStatsWidget.tsx`
- [ ] Sub-bagian "PER KELAS" dihapus dari kartu ini untuk mencegah duplikasi informasi.
- [ ] Ukuran kartu 4 status (Hadir, Sakit, Izin, Alpha) lebih proporsional dan tidak memakan terlalu banyak ruang vertikal.
- [ ] Grafik batang tren mingguan memiliki label persentase capaian di atas tiap balok atau tooltip informatif saat di-hover.

### Modul C: Header & Tata Letak `DashboardPage.tsx`
- [ ] Grid Section 3 menggunakan alignment yang tidak memaksa distorsi tinggi antar kartu (`items-start`).
- [ ] Avatar profil di header kanan disembunyikan pada layar desktop saat sidebar kiri aktif.
- [ ] Tidak ada regresi fungsionalitas pada mode gelap (*dark mode*) maupun mode terang (*light mode*).

### Modul D: Pengalaman Mobile & Aksesibilitas Layar Sentuh
- [ ] Kartu 4 status kehadiran tampil rapi dalam matriks 2×2 di viewport ponsel (< 640px) tanpa ada teks/angka terpotong.
- [ ] Filter jenjang kelas dapat di-scroll horizontal secara mulus menggunakan sapuan ibu jari (*horizontal swipe*) tanpa menyebabkan horizontal page overflow.
- [ ] Semua elemen interaktif baru (chip filter, toggle akordeon, tap area tren) memiliki tinggi touch target minimal 44px (`min-h-[44px]`).
- [ ] Tidak ada tumpang tindih antara konten terbawah kartu dengan navigasi bawah (`EnhancedMobileBottomNav`).

---

## 7. Rencana Pengujian & Validasi

1. **Quality Gates Otomatis:**
   - `npm run type-check`: Bebas error tipe TypeScript pada semua props komponen yang dimodifikasi.
   - `npm run lint`: Bebas lint warning/error.
   - `npm test`: Seluruh unit test terkait dashboard (`tests/unit/dashboard-widgets.test.tsx`) tetap lulus 100%.
2. **Validasi Responsivitas & Visual:**
   - Uji tampilan pada resolusi desktop 1920×1080 (100% dan 125% scaling).
   - Uji tampilan pada resolusi laptop standar 1366×768 (layar umum guru sekolah).
   - Uji tampilan pada tablet (iPad 768×1024) dan mobile (375×667).
3. **Uji Aksesibilitas (A11y):**
   - Rasio kontras teks label abu-abu terhadap background gelap memenuhi standar WCAG AA (minimal 4.5:1).
   - Filter tingkat kelas dapat diakses menggunakan navigasi keyboard (`Tab`, `Enter`, `Space`).

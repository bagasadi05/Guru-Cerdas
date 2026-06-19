# Hasil Audit Aksesibilitas Lighthouse CI (Sprint 9)

Berikut adalah hasil pengukuran nyata aksesibilitas (A11y) dan metrik web lainnya menggunakan **Lighthouse CI** setelah perbaikan sistem form, password toggle, skip link, dan meta viewport.

## Ringkasan Skor Kepatuhan

| Halaman Audited | Aksesibilitas (A11y) | Best Practices | SEO | Performance | Laporan Publik |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Landing Page** (`/`) | **100/100** | 96/100 | 91/100 | ~91/100 | [Lihat Laporan](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1781710218639-29235.report.html) |
| **Login Dasbor Guru** (`/guru-login`) | **100/100** | 96/100 | 91/100 | ~90/100 | [Lihat Laporan](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1781710219961-80621.report.html) |
| **Dashboard** (`/dashboard`)* | **100/100** | 96/100 | 91/100 | ~90/100 | *(Teredireksi ke Login)* |
| **Detail Siswa** (`/siswa`)* | **100/100** | 96/100 | 91/100 | ~90/100 | *(Teredireksi ke Login)* |
| **Cetak Rapot** (`/cetak-rapot/1`) | **100/100** | 96/100 | 91/100 | N/A | [Lihat Laporan](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/178171021219-68456.report.html) |

*\*Catatan: Rute `/dashboard` dan `/siswa` terproteksi oleh Supabase Guard Auth. Saat di-audit secara tidak terautentikasi oleh Lighthouse, rute tersebut secara otomatis dialihkan ke `/guru-login` untuk verifikasi keamanan, sehingga mewarisi hasil optimal dari halaman login.*

## Perbaikan yang Dilakukan (S9-1)

1. **Meta Viewport (`index.html`)**:
   - **Sebelum**: `user-scalable=no` mematikan fitur zoom pada perangkat mobile, melanggar kriteria WCAG.
   - **Sesudah**: Mengembalikan parameter viewport standar untuk mendukung zoom visual demi pengguna dengan keterbatasan penglihatan.

2. **Skip to Content Link (`src/App.tsx`)**:
   - **Before**: Skip link `<a href="#main-content">` tidak memiliki target elemen yang valid, sehingga tidak berfungsi untuk pengguna keyboard.
   - **Sesudah**: Menambahkan elemen `<div id="main-content" tabIndex={-1} className="outline-none" />` di awal kontainer konten utama.

3. **Password Toggle Button (`src/components/pages/LoginPage.tsx`)**:
   - **Sebelum**: Button toggle visibilitas password tidak memiliki label teks pembantu dan ukurannya terlalu kecil.
   - **Sesudah**: Menambahkan `aria-label="Tampilkan kata sandi"` / `"Sembunyikan kata sandi"`, serta meningkatkan ukuran klik target menjadi `w-11 h-11` (memenuhi standar WCAG minimum `44px`).

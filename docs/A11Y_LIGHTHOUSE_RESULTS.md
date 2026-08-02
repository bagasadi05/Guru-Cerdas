# Hasil Audit Lighthouse CI — Portal Guru

Log pengukuran Lighthouse CI. **Bagian teratas = pengukuran terbaru**; bagian bawah = baseline historis.

---

## 📊 Pengukuran 2026-08-01 — Font Self-Hosted & Palet Brand Pilot

**Kondisi terukur**: build produksi terbaru (`dist` fresh, PWA precache 30 entri / 2002.79 KiB). Font **Inter sudah self-hosted penuh** — semua `@font-face` menunjuk `/assets/fonts/inter-latin-*.woff2` dengan `font-display:swap`, dan **nol** referensi `fonts.googleapis.com`/`fonts.gstatic` tersisa di bundle. Palet brand "Laguna" aktif di LoginPage & Dashboard.

**Metode**: `lhci autorun` — 3 run × 5 URL, form factor desktop, throttling 40 ms / 10 Mbps, `onlyCategories` = a11y / best-practices / performance / seo. Threshold CI: a11y ≥ 0.95 (error), best-practices ≥ 0.9 (error), seo ≥ 0.9 (error), performance ≥ 0.8 (warn).

### Skor Median (3 run)

| Halaman Audited | A11y | Best Practices | SEO | Performance | vs Baseline (Sprint 9) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Landing Page** (`/`) | **98** | 96 | **92** | 63 | a11y −2 · perf −28 |
| **Login Dasbor Guru** (`/guru-login`) | **98** | 96 | **92** | 62 | a11y −2 · perf −28 |
| **Dashboard** (`/dashboard`)* | **98** | 96 | **92** | 64 | a11y −2 · perf −26 |
| **Detail Siswa** (`/siswa`)* | **98** | 96 | **92** | 63 | a11y −2 · perf −27 |
| **Cetak Rapot** (`/cetak-rapot/1`) | **100** | 96 | 91 | N/A | a11y ±0 |

*Teredireksi ke `/guru-login` (Supabase Guard Auth) — mewarisi hasil halaman login.*

### Hasil Assertion (CI Gate)

| Gate | Status |
| :--- | :--- |
| Accessibility ≥ 0.95 | ✅ LULUS (0.98) |
| Best Practices ≥ 0.9 | ✅ LULUS (0.96) |
| SEO ≥ 0.9 | ✅ LULUS (0.91–0.92) |
| Performance ≥ 0.8 | ⚠️ WARN (0.62–0.64) — bukan error, tapi turun signifikan dari baseline |

### Temuan

1. **`heading-order` — satu-satunya temuan a11y (100 → 98)**. Audit menandai **`<h4>` "Install Aplikasi Portal" di `src/components/PwaPrompt.tsx` (baris 158)**. Heading-nya **melompati level** (h4 muncul tanpa `<h3>` di antaranya setelah heading utama h1/h2), melanggar WCAG 1.3.1 (Info & Relationships). Muncul di 4 dari 5 URL — PwaPrompt dirender di halaman utama (Landing/Login/Dashboard/Siswa) tetapi tidak di halaman cetak rapot, sehingga Cetak-Rapot lolos. **Fix sederhana**: ganti `<h4>` menjadi `<div>`/`<p>` (bukan heading — teks banner install tidak perlu jadi heading semantik) atau naikkan level heading secara konsisten.
2. **Performance turun ~90 → 62–64**. Metrik: FCP 3.2 s, LCP 3.7 s, SI 3.2 s, TTI 3.7 s — tetapi **TBT 0 ms & CLS 0.000** (tidak ada blokir JS / layout shift). Penyebab dominan adalah **waktu transfer bundle**: precache PWA 2002.79 KiB + throttle 10 Mbps ≈ 1.6 s transfer saja, ditambah render client-side. Bundle tumbuh besar sejak baseline (banyak fitur ditambahkan). Font self-hosted **bukan** penyebab (swap, non-blocking, aset lokal).
3. **`errors-in-console`: 15× "Failed to load resource: 400"** di halaman login/dashboard/siswa — ✅ **SUDAH DIPERBAIKI (2026-08-01)**. Akar masalah: `SoftDeleteService.cleanupExpired()` menjalankan query batch `select=id&deleted_at=lt.<cutoff>` untuk semua entitas di `ALL_SOFT_DELETE_ENTITIES` — tapi tabel `user_settings` memakai primary key `user_id` dan **tidak punya kolom `id`**, sehingga PostgREST membalas HTTP 400 untuk satu-satunya tabel itu (semua tabel lain → 200). Catatan: kolom `deleted_at` ADA di `user_settings` (ditambahkan migration 20260622000000), jadi `getDeletedItems` tetap aman — hanya jalur `select('id')` batch yang rusak. Query dijalankan di setiap startup halaman ber-guard → 15× (3 run × 5 URL). Fix (dua lapis): pertama, `ENTITIES_WITHOUT_ID_COLUMN` mengecualikan `user_settings` dari loop cleanup; lalu di-*refactor* menjadi map `ENTITY_KEY_COLUMN` (`src/services/SoftDeleteService.ts`) yang memakai **kolom kunci per entity** (`id` untuk hampir semua tabel, `user_id` untuk `user_settings`) — jadi `user_settings` kini ikut di-cleanup dengan benar memakai `user_id`, hardcode `select('id')` hilang, dan `Record<SoftDeleteEntity, string>` memaksa tiap entity baru terdaftar (TS error kalau lupa → pola 400 ini otomatis terhindar di masa depan). Test regresi di `integration.test.ts` memverifikasi `user_settings` di-select dengan `user_id`.
4. **SEO naik 91 → 92** di 4 halaman. Cetak-Rapot tetap 91 karena audit `robots.txt` (repo tidak punya `public/robots.txt` — tidak relevan untuk halaman cetak internal).
5. **Cetak Rapot a11y 100** — halaman cetak konsisten sempurna.

### Laporan Publik (temporary-public-storage)

| Halaman | Laporan |
| :--- | :--- |
| Landing Page | [reports/1785555649298-95777.report.html](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1785555649298-95777.report.html) |
| Login Dasbor Guru | [reports/1785555650694-84497.report.html](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1785555650694-84497.report.html) |
| Dashboard | [reports/1785555652140-37193.report.html](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1785555652140-37193.report.html) |
| Detail Siswa | [reports/1785555653642-51965.report.html](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1785555653642-51965.report.html) |
| Cetak Rapot | [reports/1785555655039-22213.report.html](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1785555655039-22213.report.html) |

### Rekomendasi Prioritas

1. Fix `heading-order` di `src/components/PwaPrompt.tsx` — ganti `<h4>` jadi `<div>`/`<p>` (1–2 baris), langsung mengembalikan a11y ke 100 di 4 halaman.
2. Perf: evaluasi code-split chunk besar (dinamis sudah ada untuk beberapa modul) atau kurangi ukuran precache; TBT/CLS sudah ideal, jadi fokus di transfer size.
3. ~~Telusuri request 400 di console~~ ✅ Selesai — fix `ENTITIES_WITHOUT_ID_COLUMN` di SoftDeleteService (user_settings skip dari cleanupExpired).

---

## 📜 Baseline Historis — Sprint 9 (perbandingan)

Hasil pengukuran nyata aksesibilitas (A11y) dan metrik web lainnya menggunakan **Lighthouse CI** setelah perbaikan sistem form, password toggle, skip link, dan meta viewport.

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

# Coverage Baseline & Gate Configuration

## Ringkasan Eksekutif
Berdasarkan audit infrastruktur QA di Sprint 9, coverage testing pada aplikasi **Portal Guru** saat ini berada pada baseline berikut (diukur menggunakan `@vitest/coverage-v8` per 17 Juni 2026 setelah seluruh pengerjaan design system selesai):

| Metrik | Baseline Terukur | Threshold Gate (CI) | Status |
| --- | --- | --- | --- |
| **Statements** | **9.56%** | **8.00%** | ✅ PASSED |
| **Branches** | **6.16%** | **5.00%** | ✅ PASSED |
| **Functions** | **7.52%** | **6.00%** | ✅ PASSED |
| **Lines** | **10.27%** | **8.00%** | ✅ PASSED |

## Mengapa Coverage di Bawah 70%?
1. **Mocking Supabase**: Hampir seluruh database service dan interaksi otentikasi di-mock sepenuhnya dalam test suite integration untuk menghindari ketergantungan pada live database. Hal ini menyebabkan modul-modul di `src/services/` memiliki coverage rendah.
2. **Ketergantungan UI/Interaksi**: Halaman utama dan alur absensi/siswa memiliki interaksi visual yang kompleks dan visual state, yang lebih cocok diuji menggunakan Playwright E2E/Visual Regression daripada component unit test jsdom.
3. **PWA & Service Worker**: Fitur-fitur PWA (`src/sw.js`, push notification, dll.) diuji secara terpisah dan di-exclude dari coverage karena dijalankan langsung oleh runtime browser/Workbox.

## Kebijakan Gate CI/CD
Threshold diatur di file `vite.config.ts` mendekati baseline dengan buffer keselamatan agar pipeline CI/CD tetap hijau pada setiap pull request, sambil mencegah regresi besar-besaran (misalnya jika ada penghapusan test suite secara tidak sengaja).

Target di masa mendatang adalah meningkatkan coverage secara bertahap dengan menulis unit test terfokus pada:
- Utility functions di `src/utils/`
- Custom hooks terisolasi di `src/hooks/`

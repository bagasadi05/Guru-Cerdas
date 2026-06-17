# E2E Visual Regression Testing & Baseline Documentation

## Ringkasan Eksekutif
Sebelumnya, pengujian visual pada aplikasi menggunakan mockup buatan AI. Pada Sprint 9, infrastruktur QA visual telah diperbaiki sepenuhnya menggunakan **Playwright** asli yang terintegrasi langsung dengan preview build aplikasi (Vite preview). 

Semua screenshot baseline saat ini adalah **SCREENSHOT ASLI** yang diambil langsung dari engine render browser Chromium sesungguhnya dalam mode Light dan Dark.

## Daftar Halaman Utama yang Diuji
Berikut adalah daftar halaman/komponen kunci yang diuji secara visual:

1. **Role Selection Page (`/`)**
   - **Deskripsi**: Halaman awal pemilihan peran antara Guru dan Wali Murid.
   - **Screenshot Baseline**:
     - Light Mode: `e2e/visual/visual.spec.ts-snapshots/role-selection-chromium-light-win32.png`
     - Dark Mode: `e2e/visual/visual.spec.ts-snapshots/role-selection-chromium-dark-win32.png`

2. **Teacher Login Page (`/guru-login`)**
   - **Deskripsi**: Halaman masuk bagi Guru dengan form email dan kata sandi yang divalidasi.
   - **Screenshot Baseline**:
     - Light Mode: `e2e/visual/visual.spec.ts-snapshots/teacher-login-chromium-light-win32.png`
     - Dark Mode: `e2e/visual/visual.spec.ts-snapshots/teacher-login-chromium-dark-win32.png`

3. **Parent Portal Login Page (`/portal-login`)**
   - **Deskripsi**: Halaman autentikasi menggunakan kode akses bagi wali murid/orang tua.
   - **Screenshot Baseline**:
     - Light Mode: `e2e/visual/visual.spec.ts-snapshots/parent-portal-login-chromium-light-win32.png`
     - Dark Mode: `e2e/visual/visual.spec.ts-snapshots/parent-portal-login-chromium-dark-win32.png`

4. **Dashboard Page (`/dashboard`) - Terautentikasi**
   - **Deskripsi**: Halaman dashboard utama guru yang memuat metrik, jadwal harian, pintasan aksi cepat, dan feed aktivitas (diuji dengan mem-bypass autentikasi menggunakan mock session `portal-guru-auth` di localStorage serta mengintersept API REST Supabase).
   - **Screenshot Baseline**:
     - Light Mode: `e2e/visual/visual.spec.ts-snapshots/dashboard-chromium-light-win32.png`
     - Dark Mode: `e2e/visual/visual.spec.ts-snapshots/dashboard-chromium-dark-win32.png`

5. **Students List Page (`/siswa`) - Terautentikasi**
   - **Deskripsi**: Halaman daftar siswa yang menampilkan tabel/grid data siswa kelas (diuji dengan intersept API Supabase).
   - **Screenshot Baseline**:
     - Light Mode: `e2e/visual/visual.spec.ts-snapshots/students-list-chromium-light-win32.png`
     - Dark Mode: `e2e/visual/visual.spec.ts-snapshots/students-list-chromium-dark-win32.png`

## Cara Menjalankan & Memperbarui Tes Visual
Pengujian visual dijalankan di atas build produksi lokal untuk menjamin akurasi:

```bash
# 1. Bangun aplikasi
npm run build

# 2. Jalankan pengujian visual
npx playwright test

# 3. Perbarui seluruh baseline jika ada perubahan desain yang disetujui (DoD)
npx playwright test --update-snapshots
```

## Kebijakan Toleransi Perbedaan Visual
Threshold toleransi perbedaan piksel (`maxDiffPixelRatio`) dikonfigurasi pada nilai **0.05 (5%)** di file `playwright.config.ts` untuk menangani sedikit perbedaan rendering sub-pixel teks pada sistem operasi yang berbeda.

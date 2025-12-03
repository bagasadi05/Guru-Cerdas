# Portal Guru

Portal Guru adalah aplikasi manajemen kehadiran siswa modern yang dirancang untuk memudahkan guru dalam mencatat, menganalisis, dan melaporkan kehadiran siswa. Aplikasi ini mendukung fitur offline (PWA) dan analisis cerdas menggunakan AI.

## Fitur Utama

- **Manajemen Absensi Real-time**: Catat kehadiran (Hadir, Izin, Sakit, Alpha) dengan mudah.
- **Dukungan Offline (PWA)**: Tetap bisa mencatat absensi tanpa koneksi internet. Data akan disinkronkan otomatis saat online.
- **Analisis Cerdas (AI)**: Menggunakan Google Gemini AI untuk menganalisis pola kehadiran siswa.
- **Ekspor Laporan**: Unduh laporan absensi bulanan dalam format PDF dan Excel.
- **Direktori Siswa**: Manajemen data siswa yang terorganisir per kelas.

## Teknologi yang Digunakan

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Backend / Database**: Supabase
- **AI Integration**: Google Generative AI SDK
- **PWA**: Vite PWA Plugin
- **PDF/Excel**: jsPDF, SheetJS (xlsx)

## Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)
- [npm](https://www.npmjs.com/)

## Cara Menjalankan Proyek

1.  **Clone repositori ini** (jika belum):
    ```bash
    git clone <repository-url>
    cd Portal-Guru-main
    ```

2.  **Instal dependensi**:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables**:
    Buat file `.env` di root direktori dan tambahkan konfigurasi berikut (sesuaikan dengan kredensial Supabase dan Google AI Anda):
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GOOGLE_AI_KEY=your_google_ai_key
    ```

4.  **Jalankan server pengembangan**:
    ```bash
    npm run dev
    ```
    Akses aplikasi di `http://localhost:5173`.

## Struktur Proyek

- `/components`: Komponen React (UI, Pages, dll).
- `/services`: Logika bisnis dan integrasi API (Supabase, AI).
- `/hooks`: Custom React Hooks.
- `/types`: Definisi tipe TypeScript (sedang dalam perbaikan sentralisasi).
- `/public`: Aset statis.

## Lisensi

[MIT](LICENSE)

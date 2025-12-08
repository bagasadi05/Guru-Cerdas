# Portal Guru

Portal Guru adalah aplikasi manajemen sekolah modern yang dirancang untuk memudahkan guru dalam mencatat kehadiran, memantau perkembangan siswa, dan berkomunikasi dengan orang tua. Aplikasi ini dibangun dengan teknologi web modern dan mendukung fitur Progressive Web App (PWA) untuk penggunaan offline.

## Fitur Utama

### 📱 Manajemen Kelas & Absensi
- **Absensi Real-time**: Catat kehadiran (Hadir, Izin, Sakit, Alpha) dengan antarmuka yang cepat dan intuitif.
- **Dukungan Offline (PWA)**: Tetap produktif tanpa koneksi internet. Data akan disinkronkan otomatis saat online.
- **Jadwal Pelajaran**: Tampilan jadwal mingguan yang responsif dan mudah dibaca.

### 📊 Analisis & Laporan
- **Dashboard Interaktif**: Ringkasan statistik kehadiran dan performa kelas dalam satu pandangan.
- **Analisis AI**: Wawasan cerdas tentang pola kehadiran dan perilaku siswa menggunakan Google Gemini AI.
- **Cetak Rapor**: Generate laporan hasil belajar siswa dalam format PDF siap cetak.

### 👨‍👩‍👧‍👦 Portal Orang Tua & Siswa
- **Akses Khusus**: Orang tua dapat memantau kehadiran, nilai, dan pelanggaran siswa menggunakan kode akses unik.
- **Komunikasi Dua Arah**: Fitur pesan terintegrasi antara guru dan orang tua.
- **Transparansi**: Lihat catatan pelanggaran dan poin keaktifan secara real-time.

### ⚙️ Personalisasi
- **Profil Guru**: Kelola data diri dan nama sekolah.
- **Tema & Tampilan**: Dukungan Dark Mode dan kustomisasi antarmuka.

## Teknologi

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion (Glassmorphism Design)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **AI**: Google Generative AI SDK
- **PWA**: Vite PWA Plugin, Workbox
- **PDF**: jsPDF

## Cara Menjalankan Proyek

1.  **Clone repositori**:
    ```bash
    git clone <repository-url>
    cd Portal-Guru-main
    ```

2.  **Instal dependensi**:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables**:
    Buat file `.env` di root direktori:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GOOGLE_AI_KEY=your_google_ai_key
    ```

4.  **Jalankan server pengembangan**:
    ```bash
    npm run dev
    ```
    Akses di `http://localhost:5173`.

## Struktur Proyek

- `/src/components`: Komponen UI (Pages, Shared Components).
- `/src/hooks`: Custom React Hooks (useAuth, useOfflineStatus, dll).
- `/src/services`: Integrasi API (Supabase, AI, PDF Generator).
- `/src/types`: Definisi tipe TypeScript.

## Lisensi

[MIT](LICENSE)

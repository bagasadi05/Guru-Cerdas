# Application Analysis Task
- [x] Analyze application structure and architecture
- [ ] Review core configuration (Vite, Package.json, TSConfig)
- [x] Review state management and data fetching (React Query, Supabase)
- [x] Analyze code quality (Linting rules, TypeScript strictness, Error handling)
- [x] Analyze performance (Bundle splitting, PWA config, image optimization)
- [x] Review UI/UX structure and mobile readiness (Capacitor)
- [x] Synthesize findings into a final report

## Fase 2: Implementasi Penyempurnaan Lanjutan

### Keamanan & Manajemen Storage
- [ ] Buat utilitas storage yang universal (IndexedDB + Capacitor Preferences)
- [ ] Migrasi `offlineQueue` dan `offlineQueueEnhanced` sepenuhnya ke IndexedDB (hapus fallback `localStorage`)
- [ ] Migrasi data sensitif (log keamanan, timer sesi) keluar dari `localStorage`
- [ ] Enkripsi kunci data tertentu jika memungkinkan

### Kualitas Kode & React Hooks
- [ ] Analisis dan perbaiki `eslint-disable react-hooks/exhaustive-deps` di komponen utama
- [ ] Stabilkan referensi dengan `useCallback` dan `useMemo` untuk mencegah infinite re-renders
- [ ] Bersihkan unused variables dan interface yang tak terpakai (contoh: [FormState](file:///c:/Users/yuiop/Documents/Coding/Portal-Guru-main/src/hooks/useFormValidation.tsx#11-19))

### UX & Resiliensi Offline
- [ ] Sempurnakan mekanisme sinkronisasi offline di backend/service worker
- [x] Optimasi UX indikator offline/online
- [x] Review lazy loading boundary agar bundle tetap kecil saat PWA diunduh

## Fase 4: Optimasi Performa & Kualitas Kode (Linting)

### Pembersihan Code Quality (TypeScript & ESLint)
- [ ] Atasi 243+ warning `no-explicit-any` dengan menetapkan tipe ketat atau `unknown`.
- [ ] Hapus/komentari 184+ `no-unused-vars` di struktur aplikasi.
- [ ] Atasi 86 peringatan `react-refresh/only-export-components` pada ekspor non-komponen.
- [ ] Selesaikan sisa isu `exhaustive-deps` di hooks utama.

### Optimasi Bundle & Performance
- [ ] Terapkan *Dynamic Import* penuh untuk pustaka PDF Generator (`jspdf`, `jspdf-autotable`)
- [ ] Terapkan *Dynamic Import* untuk utilitas besar seperti ekspor Excel (`exceljs`), pastikan dipotong dari bundle awal.
- [ ] Analisis dan pangkas ukuran file import di page besar.

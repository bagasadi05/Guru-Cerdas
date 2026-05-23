---
name: guru-cerdas-coding-assistant
description: >
  Coding assistant untuk project Portal Guru (Guru Cerdas) — aplikasi manajemen
  sekolah berbasis React + TypeScript + Supabase untuk guru di Indonesia.
  Gunakan konteks ini saat membantu debugging, refactoring, penambahan fitur,
  atau analisis kode di project ini.
---

# Portal Guru — Project Context

## Ringkasan Project
Portal Guru adalah PWA (Progressive Web App) manajemen sekolah untuk guru Indonesia.
- **Nama app:** Portal Guru / Guru Cerdas
- **Target user:** Guru SD/SMP/SMA di Indonesia
- **Bahasa UI:** Bahasa Indonesia
- **Platform:** Web (PWA) + Android (Capacitor)

## Tech Stack
- **Frontend:** React 18, TypeScript 5.8 (strict), Vite 6
- **Routing:** React Router DOM 6
- **State/Data:** TanStack Query v5
- **Styling:** Tailwind CSS 3, Framer Motion 12
- **Forms:** React Hook Form + Zod v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, RLS)
- **AI:** Pioneer AI (Claude Opus 4.7) via `src/services/pioneerService.ts`
- **Mobile:** Capacitor 8 (Android)
- **Export:** jsPDF, xlsx, html2canvas
- **Testing:** Vitest 4, Testing Library, Playwright

## Struktur Direktori Penting
```
src/
├── App.tsx                    # Root component, routing
├── components/
│   ├── pages/                 # 20+ halaman (lazy-loaded)
│   ├── ui/                    # Komponen UI reusable
│   ├── dashboard/             # Widget dashboard
│   ├── students/              # Komponen manajemen siswa
│   ├── attendance/            # Komponen absensi
│   └── ...
├── hooks/                     # 40+ custom hooks
├── services/
│   ├── supabase.ts            # Supabase client (resilient fetch)
│   ├── database.types.ts      # Auto-generated Supabase types
│   ├── openRouterService.ts   # AI service (OpenRouter, free models)
│   ├── pioneerService.ts      # AI service (Pioneer, Claude Opus 4.7)
│   └── ...
├── types/
│   ├── index.ts               # Barrel export semua types
│   ├── database.ts            # DB row/insert/update types
│   ├── enums.ts               # Enums (AttendanceStatus, dll)
│   └── ...
└── utils/                     # 30+ utility functions
```

## Konvensi Kode
- Semua komponen menggunakan **functional components** dengan hooks
- Import types menggunakan `import type { ... }` (isolatedModules)
- Path alias: `@/` → `src/`
- Semua teks UI dalam **Bahasa Indonesia**
- Tailwind untuk styling, hindari inline styles
- TanStack Query untuk semua data fetching dari Supabase
- Zod untuk validasi form

## Database (Supabase)
Tabel utama:
- `students` — data siswa
- `classes` — data kelas
- `attendance` — absensi (status: Hadir/Izin/Sakit/Alpha)
- `academic_records` — nilai akademik
- `violations` — pelanggaran siswa
- `tasks` — tugas guru
- `schedules` — jadwal pelajaran
- `communications` — pesan guru-orang tua
- `quiz_points` — poin gamifikasi
- `semesters` / `academic_years` — periode akademik

Semua tabel menggunakan **Row Level Security (RLS)** dengan `user_id = auth.uid()`.

## AI Integration
- **Pioneer AI** (`pioneerService.ts`): Claude Opus 4.7 via `https://api.pioneer.ai/v1/messages`
  - Digunakan untuk analisis mendalam, code review, dan fitur AI premium
  - API key: env var `VITE_PIONEER_API_KEY` (dev only)
- **OpenRouter** (`openRouterService.ts`): Model gratis sebagai fallback
  - Digunakan untuk AI insights ringan di dalam app

## Fitur Utama
1. Absensi real-time dengan status Hadir/Izin/Sakit/Alpha
2. Manajemen siswa (CRUD, foto, soft-delete)
3. Nilai akademik per mata pelajaran
4. Portal orang tua (akses via kode unik)
5. Jadwal pelajaran mingguan
6. Laporan/rapor PDF
7. Gamifikasi (poin, badge, leaderboard)
8. Analitik kelas
9. Offline-first dengan service worker
10. Android app via Capacitor

## Hal yang Perlu Diperhatikan
- Jangan expose API keys ke client bundle di production
- Gunakan `import type` untuk type-only imports
- Semua mutation Supabase harus handle offline queue
- Komponen baru harus accessible (ARIA labels, keyboard nav)
- Test dengan Vitest sebelum commit

# Project: Portal Guru

> **Dokumen overview proyek** — bukan daftar fitur. Riwayat: [CHANGELOG.md](CHANGELOG.md).
> Arah: [docs/ROADMAP.md](docs/ROADMAP.md). Audit terakhir: [docs/reviews/](docs/reviews/).

## Apa ini

**Portal Guru** adalah PWA manajemen sekolah untuk guru madrasah Indonesia:
absensi real-time + offline, jadwal & Penilaian Harian, jurnal mengajar, input nilai
massal (7 mode, termasuk dikte suara), analitik akademik & prediksi risiko, rapor PDF,
Program Bintang (perilaku positif + pelanggaran), Modul Ajar AI, Prota & Promes,
portal orang tua berkode akses, laporan WhatsApp, dan ekspor dokumen formal
(PDF vektor / DOCX / XLSX).

Diproduksi untuk komunitas madrasah (awal: MI Al Irsyad Madiun) dan dibangun
offline-first — pengguna guru Indonesia sering bekerja dengan koneksi tidak stabil.

## Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript ~5.8 + Vite 6, Tailwind 3, TanStack Query, react-router |
| Backend | Supabase (Postgres + RLS + Edge Functions, 140+ migrasi) |
| Serverless | Vercel (`api/`): proxy AI (Gemini/Groq), Telegram, ekspor dokumen |
| Offline | Workbox PWA (`src/sw.js`) + antrean mutasi IndexedDB (`src/services/offline/`) |
| Testing | Vitest (jsdom) + Playwright (functional & visual) + skrip audit mandiri |
| CI/CD | GitHub Actions (`ci.yml` & lainnya), deploy Vercel + Supabase manual-dispatch |

## Peta kode

```
src/
  components/pages/<fitur>/   feature slice: komponen + hooks (+ engine bila kompleks)
    mass-input/engine/         pola referensi: store headless + ports, tanpa React
  components/ui/               komponen presentasi murni (0 impor supabase)
  services/                    akses data, AI, ekspor, offline, logging
  hooks/                       hook lintas-fitur
api/                           serverless Vercel (_requestGuard, _auth, _documentExport)
supabase/
  migrations/                  sumber kebenaran schema (140+)
  functions/                   Edge Functions (push, wa-worker, telegram, dll.)
scripts/                       tooling audit + worker WhatsApp + migrasi data one-off
docs/                          PRD, audit, panduan; reviews/ = review berformat
```

## Konvensi penting

- **Bahasa:** kode & komentar Inggris; dokumentasi & teks user-facing Indonesia.
- **RLS dulu:** setiap tabel baru wajib migrasi + policy RLS (`is_admin_user`,
  `has_teacher_class_assignment`); tulis lewat RPC SECURITY DEFINER bila lintas-peran.
- **Secret server-side:** `api/` dan Edge Functions; klien hanya `VITE_*` non-rahasia.
- **Offline queue** = jalur fungsional di `src/services/offline/functionalQueue.ts`
  (driven by `useSyncQueue`). Jangan bangun queue baru tanpa melihat modul itu.
- **Gate lokal:** `npx tsc --noEmit` → `npm run lint` → `npm test` sebelum push.

## Status terkini (16 Nov 2026)

- Rilis stabil: v1.2.0 (27 Sep 2026); CHANGELOG [Unreleased] berisi kerja Okt–Nov.
- Review & perbaikan keamanan `api/`: [docs/reviews/2026-11-16-review-proyek.md](docs/reviews/2026-11-16-review-proyek.md).
- Drift schema aktif (perlu db push + regen types): [docs/DB_SCHEMA_DRIFT_2026-11-16.md](docs/DB_SCHEMA_DRIFT_2026-11-16.md).
- Plan perbaikan 4 fase: [docs/reviews/2026-11-16-masukan-strategis.md](docs/reviews/2026-11-16-masukan-strategis.md) §5.

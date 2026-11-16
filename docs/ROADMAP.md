# Roadmap Gulir — Portal Guru

> **Kebijakan dokumen (16 Nov 2026):** roadmap ini hanya berisi pekerjaan yang punya
> PRD/plan aktif. Tidak ada tanggal rilis tanpa PRD; entri pindah ke "Selesai" saat
> tercatat di CHANGELOG. Ambisi tanpa komitmen ada di [vision.md](vision.md).
> Roadmap versi lama (Agustus 2026) dihapus — target rilis dan coverage-nya tidak
> pernah tercapai dan tidak sinkron dengan CHANGELOG.

**Terakhir diperbarui:** 16 November 2026

---

## Realita saat ini

- **Rilis:** v1.0.0 (1 Sep 2026) → v1.1.0 (20 Sep) → v1.2.0 (27 Sep); kerja Okt–Nov
  tercatat di CHANGELOG `[Unreleased]` + `public/release-notes.json` (terakhir 2026.10.25).
- **Produksi:** madrasah awal (MI Al Irsyad Madiun) + guru madrasah Indonesia umum.
- **Kualitas terukur (16 Nov):** tsc bersih; lint 0 error / 517 warning; 2.930 test
  (2.925 lulus, 5 flaky timeout paralel — lulus terisolasi); coverage gate 8% statements;
  Lighthouse perf 62–64 (belum digate ke CI — plan F2.2).

## Sedang berjalan (punya PRD/plan)

| Aliran | Sumber | Status | Sisa pekerjaan utama |
|---|---|---|---|
| Plan perbaikan 4 fase (loop-closing, CI gates, struktur) | [reviews/2026-11-16-masukan-strategis.md](reviews/2026-11-16-masukan-strategis.md) §5 | **Fase 1 berjalan** | F1.3–F1.8; F2 CI gate & CSP; F3 refactor per-domain |
| Perbaikan dashboard | [prd-dashboard-improve.md](prd-dashboard-improve.md) | Ditutup-status 16 Nov (temuan kritisnya sudah tidak ada di kode) | Eksekusi usulan §4 (onboarding, cache offline dashboard) |
| Input nilai — fase 3–4 | [prd-input-nilai-improve.md](prd-input-nilai-improve.md) §5.7–5.9 | Fase 1–2 selesai | Draft semua mode + antrean offline kuis/sikap/pelanggaran; pecah halaman per mode |
| Ekspor dokumen server-side | [prd-modul-ajar-ekspor-dokumen.md](prd-modul-ajar-ekspor-dokumen.md) | Fase 1 di balik flag | Rollout §12: aktif semua guru, hapus jalur raster (plan F1.8) |
| Analisis akademik | [prd-analisis-akademik-improve.md](prd-analisis-akademik-improve.md) | PRD masih Draft | Finalisasi PRD sebelum eksekusi |

## Antrian infrastruktur (dari plan 16 Nov)

1. **Drift schema (blocking):** `grade_promotion_batches` & `student_class_histories`
   belum di-push; `user_settings.fonnte_config` tanpa migrasi. Langkah owner:
   [DB_SCHEMA_DRIFT_2026-11-16.md](DB_SCHEMA_DRIFT_2026-11-16.md).
2. CI: audit scripts + LHCI + e2e functional + Trivy blocking (F2.1–F2.5).
3. Keamanan gateway: CSP tanpa `unsafe-inline`, keputusan `--no-verify-jwt` (F2.6–F2.7).
4. Struktur: sentralisasi akses DB per-domain, pecah 4 komponen raksasa, satu stack
   ekspor (F3.1–F3.5).

## Metrik yang dipantau

| Metrik | Sumber kebenaran | Nilai 16 Nov |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 error |
| Lint | `eslint .` | 0 error, 517 warning (budget per-folder menyusul, F3.7) |
| Test | `npm test` | 2.925/2.930 (flaky paralel — penanganan menyusul di F2.3) |
| Coverage | `vitest --coverage` gate | 8% statements (target bertahap 15% → 25%) |
| Perf | LHCI mingguan (F2.2) | 62–64, target ≥ 80 setelah precache dirampingkan |
| A11y | LHCI gate ≥ 0.95 | 98–100 |

## Selesai (2026)

- Desain system & QA Sprint 9 — arsip: [PROJECT_CLOSURE.md](PROJECT_CLOSURE.md)
- Voice Grade M1–M3 — arsip: [fitur-voice-grade.md](fitur-voice-grade.md)
- Hardening DB Okt 2026 + review keamanan `api/` — [reviews/2026-11-16-review-proyek.md](reviews/2026-11-16-review-proyek.md)

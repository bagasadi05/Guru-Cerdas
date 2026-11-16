# Masukan Strategis — Portal Guru

**Tanggal:** 16 November 2026
**Sifat:** analisis lintas dimensi (produk, arsitektur, kualitas/performa/keamanan) + sintesis atas review kode hari ini
**Metode:** tiga analisis paralel oleh agent riset (dokumen produk · struktur kode · postur gate) + verifikasi silang manual atas setiap klaim load-bearing + review kode dua-sumbu yang sudah dilakukan pagi hari ([2026-11-16-review-proyek.md](2026-11-16-review-proyek.md))
**Batasan:** angka kematangan fitur adalah inferensi dokumen, bukan audit kode; temuan lapisan `api/` tidak diulang di sini.

---

## 1. Ringkasan eksekutif

Fondasi teknis Portal Guru **di atas rata-rata proyek sejenis**: 140 migrasi SQL dengan disiplin RLS yang konsisten, backup harian dengan checksum, header keamanan lengkap, code-splitting menyeluruh, satu modul (`mass-input/engine`) yang menjadi contoh arsitektur yang benar, dan tooling audit buatan sendiri yang jarang dimiliki repo lain.

Risiko terbesarnya justru **bukan di kode**, melainkan di tiga hal:

1. **Dokumen strategi basi dan kontradiktif.** `docs/ROADMAP.md` terakhir diperbarui 2 Agustus, menargetkan coverage ">80%" padahal QA internal mencatat 9,56%, menjanjikan v2.0.0 "30 September" yang tidak pernah ada, dan memuat fase Q4 "Enterprise" tanpa satu pun PRD. Dokumen ini aktif menyesatkan — termasuk agent AI yang bekerja berdasarkan `AGENTS.md`.
2. **Gate kualitas berat tidak pernah berjalan otomatis.** Lighthouse CI (dengan gate ketat di `lighthouserc.cjs`), 42 test Playwright, 5 test visual, dan 8 skrip audit semuanya manual. Perf 62–64 (di bawah budget) tidak akan pernah terdeteksi CI.
3. **Boundary arsitektur bocor perlahan.** 111 panggilan `supabase.from()` di luar `src/services` (vs 57 di dalam), 4 komponen >50 KB, minimal 3 stack ekspor dokumen, dan dua stack sinkronisasi offline — salah satunya dead code 469 baris.

**Pola meta yang menghubungkan semuanya:** proyek ini **sangat baik memulai, lemah menutup siklus**. Fitur ditinggal di bawah 100% (Voice Grade M4 "PLANNED", ekspor Modul Ajar macet di feature flag), dokumen ditinggal tanpa status akhir (PRD "Draft" berisi klaim P0 yang ternyata sudah diperbaiki di kode), gate ditulis tapi tidak di-wire, laporan diukur sekali tapi tidak diulang. **Perbaikan perilaku "menutup loop" adalah single highest-leverage change** — lebih murah dari refactor mana pun, dan menaikkan nilai semua yang sudah ada.

---

## 2. Yang sudah kuat — pertahankan, jangan disentuh

| # | Hal | Bukti |
|---|-----|-------|
| 1 | Disiplin RLS: `TO authenticated`, InitPlan `(SELECT auth.uid())`, `SECURITY DEFINER` + `SET search_path = public, pg_temp`, tulis via RPC bergate peran | Sampel 3 migrasi terbaru (`20261027090000`, `20261026140500`, `20261025083500`); pola konsisten di 140 migrasi |
| 2 | Infrastruktur backup & deploy yang sadar risiko: `pg_dump` terkompresi + sha256 → Google Drive retensi 90 hari; migrasi **tidak** auto-push, drift dicek `verify-applied-supabase-migrations.mjs` | `.github/workflows/backup-to-google-drive.yml`, `supabase-deploy.yml` |
| 3 | Header keamanan Vercel lengkap: HSTS preload, XFO DENY, `frame-ancestors 'none'`, Permissions-Policy, `/assets/*` immutable | `vercel.json:40-70` |
| 4 | Entry shell ramping & lazy menyeluruh: semua route `lazy()`, admin gate **sebelum** chunk di-fetch, skeleton per-route | `src/App.tsx:105-150`, `src/index.tsx` |
| 5 | `mass-input/engine` — store headless, dependency-injection via ports, framework-agnostic. **Ini pola yang harus ditiru seluruh repo.** | `pages/mass-input/engine/` (MassInputStore, VoiceGradeController) |
| 6 | `sw.js` sadar keamanan: tidak meng-cache response Supabase terautentikasi; font self-hosted dengan preload content-hashed (LCP 5,97→5,27 s) | `src/sw.js:94`, `vite.config.ts` fontPreload |
| 7 | Tooling audit internal murah & stabil hijau: `audit-dead-exports` dan `audit-stale-mocks` dijalankan hari ini — **exit 0, 0 temuan** | `scripts/audit-*.cjs` |

---

## 3. Pola meta: siklus tidak pernah ditutup

Setiap dimensi menemukan versi yang sama dari kelemahan ini:

- **Fitur:** Voice Grade — milestone M4 "Final Acceptance" PLANNED sejak lama, lint error `VoiceGradeModal.tsx:56` tercatat basi di dokumen QA.
- **Fitur:** ekspor Modul Ajar server-side — "Fase 1 diimplementasikan di balik feature flag", langkah rollout §12 (pantau 7 hari → aktif semua → hapus jalur raster lama `html2canvas`) tidak pernah terbukti tuntas. Utangnya: dua jalur ekspor hidup bersamaan.
- **Dokumen:** dua PRD dashboard masih "Draft" dan memuat temuan "Kritis/P0" (`DashboardSummaryCards` data palsu; `attendanceRecords={[]}` → 0%). **Verifikasi saya hari ini: pola `students[0]/[1]/[2]` tidak ada lagi di kode** — klaimnya tampaknya sudah diperbaiki, tetapi PRD-nya tidak pernah ditutup, sehingga dokumen itu kini menyesatkan.
- **Gate:** `lighthouserc.cjs` memuat assertion a11y ≥0.95 sebagai *error* — tetapi tidak ada satu pun workflow yang memanggil LHCI.
- **Pengukuran:** `BUNDLE_PERFORMANCE_REPORT.md` mencatat `vendor-pdf` (133,8 KB gzip = 40,5% initial load) bocor via modulepreload; fix-nya sudah ada di `vite.config.ts` (`resolveDependencies` exclude) — **tapi belum ada satu pun pengukuran ulang pasca-fix**.

**Masukan inti:** jadikan "definition of done" mencakup tiga langkah penutup: (1) status dokumen ditutup (Selesai/Batal/Arsip), (2) gate di-wire ke CI, (3) pengukuran ulang pasca-fix dicatat di laporan yang sama. Tidak butuh kode baru — hanya disiplin.

---

## 4. Masukan per dimensi

### 4.1 Strategi & dokumentasi (dampak tertinggi, usaha terendah)

Fakta kontradiksi (semua terverifikasi antar-file):

| Klaim di dokumen | Realitas terverifikasi |
|---|---|
| `ROADMAP.md`: "Test Coverage: >80%", Q1 "✅ Completed 100%" | `PROJECT_CLOSURE.md`: 9,56% statements; `vite.config.ts:305-310`: gate 8% |
| `ROADMAP.md`: v2.0.0 "September 30" | `CHANGELOG.md`: v1.0.0 rilis 1 September; v2.0.0 tidak pernah ada |
| `ROADMAP.md` Q4: Multi-tenancy, Public API, SSO, Billing | Semua PRD aktif bertarget Q4 untuk **perbaikan menu existing**; nol PRD enterprise |
| `ROADMAP.md` Phase 1.7: "Firebase Cloud Messaging" | Implementasi nyata: web-push VAPID (ditulis ulang Oktober 2026) |
| `PROJECT.md` | 100% tentang fitur Voice Grade, bukan dokumen proyek umum; M4 masih PLANNED |
| `README.md` §Dokumentasi → `docs/TECHNICAL_IMPROVEMENTS.md` | File tidak ada (yang ada `SPRINT_TECHNICAL_IMPROVEMENTS.md`); badge "TypeScript 5.0" vs aktual ~5.8 |

**Tindakan:**
1. Ganti `docs/ROADMAP.md` dengan **roadmap gulir** yang hanya berisi PRD aktif + statusnya; pindahkan visi enterprise ke `docs/vision.md` terpisah tanpa tanggal.
2. Tandai `PROJECT_CLOSURE.md` dan `PROJECT.md` sebagai arsip; isi Voice Grade pindah ke `docs/fitur-voice-grade.md`.
3. Buat `docs/CONTEXT.md` (istilah kanonik + peta modul) — playbook agent sudah merujuknya, tetapi file-nya tidak ada. Untuk proyek yang dikerjakan bersama agent AI, **dokumen yang basi = instruksi yang salah**, jadi ini juga bagian dari keamanan operasional.
4. Bersihkan pointer mati: README (dokumen tak ada, badge versi), `AGENTS.md` (menunjuk `.claude/skills/*` dan `.agents/skills/*` yang di-`.gitignore` — mati di clone bersih).

### 4.2 Kualitas & CI: semua gate berat hidup di luar CI

Digate hari ini: `tsc`, lint-error, wa-worker test, vitest (threshold 8/6/5/8%), build, dependency-review (high, PR). **Tidak digate:** Lighthouse, 42 test Playwright functional, 5 test visual (baseline `-win32`, platform-locked), Trivy (`exit-code: '0'` — tidak pernah gagalkan apa pun), 8 skrip audit.

**Tindakan (berurutan, murah dulu):**
1. **Wire skrip audit ke CI** — hari ini keduanya exit 0 dan berjalan detik-an: `audit:dead`, `audit:mocks`, `audit:schema` cukup ditambahkan sebagai step setelah lint. Usaha: < 1 jam.
2. **Wire LHCI** ke workflow mingguan (bukan per-push): `lhci autorun --config=lighthouserc.cjs` + `vite preview` — kedua config sudah menganggap port 4173. Perf 62–64 akhirnya akan terlihat sebagai warn di CI.
3. **E2E functional ke CI**: 42 test dengan config yang sudah disiapkan untuk CI (`playwright.functional.config.ts`). Visual regression tunda sampai baseline diregenerasi multi-platform.
4. **Trivy `exit-code: '1'` untuk CRITICAL** (tetap informasional untuk high/lower), dan `openrouter ... || true` di `supabase-deploy.yml:83` dihapus — kegagalan deploy AI worker tidak boleh dianggap sukses.
5. Coverage: jangan langsung mengejar 80%. Naikkan threshold **bertahap per kuartal** (8→15→25%) dan tambahkan budget warning per-folder; rencananya sudah ditulis di `docs/COVERAGE_BASELINE.md`, tinggal dieksekusi.

### 4.3 Performa: di bawah budget sejak Agustus, fix sudah ada tapi belum diverifikasi

- Lighthouse **62–64** di 4 halaman (a11y 98–100, TBT 0, CLS 0 — jadi masalahnya murni transfer size).
- PWA precache **2.002 KiB / 30 entri**; `vendor-pdf` 133,8 KB gzip pernah bocor ke initial load.
- Pengukuran pakai throttling desktop ringan (10 Mbps, CPU 1×) — angka justru optimis dibanding HP guru di lapangan.

**Tindakan:** (1) jalankan `npm run analyze` + LHCI sekarang, catat pasca-fix modulePreload di `BUNDLE_PERFORMANCE_REPORT.md` — tutup loop ini; (2) turunkan precache ke shell minimum (target < 1 MB); (3) evaluasi `framer-motion` dan `recharts` pada halaman yang jarang dibuka; (4) tambah throttling mobile di `lighthouserc.cjs` agar angka relevan dengan pengguna.

### 4.4 Arsitektur: boundary bocor pelan-pelan

| Temuan | Bukti | Level usaha |
|---|---|---|
| Akses DB bocor: **111** panggilan `supabase.from()` di luar `services/` vs 57 di dalam; 31 komponen + 16 hook impor `services/supabase` langsung; `ui/` bersih (0) | `rg` repo-wide | Besar (±2–3 minggu, per-domain: analytics → students → admin), lalu ESLint rule pelarang impor supabase di luar `services/` |
| 4 komponen raksasa: `GradePromotionModal` 83,6 KB / 1.251 baris / 16 useState; `PhScheduleTab` 58,7 KB; `AttendanceTab` 57,3 KB; `ReportPage` 54,1 KB | `Get-ChildItem` | Sedang (±1–2 hari per komponen) — pecah mengikuti pola `mass-input/engine` |
| Dua stack offline: **`useOfflineSync.ts` 469 baris = dead code** (nol importer, terverifikasi 2×); jalur hidup `useSyncQueue` → `OfflineBanner` + `queuedGradeSync` | `rg useOfflineSync` | < 1 jam untuk hapus; **keputusan owner** jika ingin menghidupkannya sebagai stack tunggal |
| Ekspor dokumen terfragmentasi ≥9 lokasi / 3 stack docx (`exportUtils.ts` 40,5 KB, `lib/modulAjarExport/`, `utils/perangkatAjarExport/`, `extracurricular/services/export/`) | listing | Sedang (±1–2 minggu) → `src/lib/export/` tunggal |
| `services/` datar 74 file campur domain & gaya penamaan (`bintangService.ts` vs `AuthSecurityService.ts`) | listing | Bertahap, ikuti refactor per-domain |
| `scripts/` campur tooling kanonik dan artefak one-off (`all_classes_parsed.json` 139 KB, `__pycache__/`) | listing | < 1 jam |

**Koreksi jujur atas pekerjaan hari ini:** perbaikan S6 (disposer `setSyncHandler`) yang saya kerjakan pagi ini ternyata menyentuh `useOfflineSync.ts` — **hook dead code**. Perbaikan API-level (P1 rate-limit/auth/origin) semuanya live code, tetapi S6 hanya bernilai jika hook itu dihidupkan. Rekomendasi: **hapus** `useOfflineSync.ts` dan `OfflineQueueService.setSyncHandler` ikut disederhanakan, atau — jika antrean offline ingin disatukan ke satu stack — jadikan `useOfflineSync` stack tunggal dan hapus `useSyncQueue`. Jangan biarkan keduanya hidup berdampingan lagi.

### 4.5 Keamanan infra: kuat di lapisan DB, paling lemah di lapisan gateway

Kuat: backup + checksum, migrasi manual-push dengan deteksi drift, RLS disiplin, dependency-review high blocking, pinning `dompurify`/`@xmldom/xmldom`.

Lemah (semua terverifikasi hari ini):
1. **CSP `script-src 'unsafe-inline'`** (`vercel.json:63`) — CSP-nya praktis tidak melindungi dari XSS. Migrasi bertahap ke nonce/hash (Vite mendukung injeksi nonce via plugin) atau minimal hapus jsdelivr dari `script-src`.
2. **Ketiga Edge Function di-deploy `--no-verify-jwt`** (`supabase-deploy.yml:81-83`) — trust boundary seluruhnya di kode function; ditambah `openrouter ... || true` yang menelan kegagalan deploy.
3. **`student_class_histories` SELECT `USING (true)`** (migrasi `20261027090000:156`) — semua authenticated bisa membaca riwayat kelas semua siswa. Mungkin disengaja untuk rapor historis, tetapi setidaknya difilter per cakupan peran/sekolah, dan diberi komentar keputusan.
4. Scanning vuln tidak pernah blocking (Trivy, npm audit issue-only); tidak ada CodeQL/secret-scanning.

### 4.6 Produk: arah jangka pendek benar, "menutup" yang jadi masalah

- **Kematangan timpang:** Modul Ajar AI, Prota/Promes, absensi = produksi-matang; Jurnal stagnan sejak v1.0.0; Voice Grade beta dengan M4 menggantung; WhatsApp **fluktuatif** (Fonnte → Baileys → Fonnte, 5 dokumen `whatsapp-*.md` tanpa satu keputusan channel).
- **Offline belum merata:** antrean offline hanya nilai mapel — "Keaktifan, sikap, dan pelanggaran masih memerlukan koneksi" (CHANGELOG). Padahal offline-first adalah pembeda utama produk.
- **Rollout ekspor Modul Ajar** tinggal langkah terakhir (pantau → aktif semua guru → hapus jalur raster lama).
- **Onboarding guru baru tidak ada** (PRD dashboard §4.5 sudah merancang `SetupProgressCard` — tinggal eksekusi; murah karena datanya sudah ter-fetch).
- **Target bisnis roadmap** ("10.000+ pengguna, 100+ sekolah") tidak ditopang dokumen eksekusi mana pun; PRD masih menyebut satu madrasah.

**Tindakan produk:** tutup loop dua PRD dashboard (klaim P0-nya sudah tidak ada di kode — cukup audit kecil + ubah status), selesaikan rollout ekspor (hapus flag `VITE_ENABLE_SERVER_DOCUMENT_EXPORT` + jalur lama), tulis satu dokumen keputusan WhatsApp (channel utama + fallback + SLO jam kirim), lalu eksekusi §5.7 PRD input-nilai (draft + antrean offline untuk semua mode).

---

## 5. Peta jalan 30/60/90 hari

**30 hari — tutup loop, semua murah:**
1. Roadmap gulir + arsip `PROJECT_CLOSURE.md`/`PROJECT.md` + `CONTEXT.md` + bersih-bersih pointer mati (±1 hari).
2. Wire `audit:dead`/`audit:mocks`/`audit:schema` ke CI; LHCI workflow mingguan (±2 jam).
3. Hapus `useOfflineSync.ts` (atau putuskan menghidupkannya — lihat §7) + bersihkan artefak one-off `scripts/` (±1 jam).
4. Ukur ulang bundle + LHCI pasca-fix modulePreload; catat di laporan yang sama (±2 jam).
5. Tutup status 2 PRD dashboard; selesaikan rollout ekspor Modul Ajar + hapus jalur `html2canvas` lama.

**60 hari — gate dan keamanan gateway:**
1. 42 test e2e functional masuk CI; regenerasi baseline visual multi-platform.
2. CSP nonce/hash; evaluasi ulang `--no-verify-jwt` per function; Trivy blocking untuk CRITICAL.
3. Mulai sentralisasi akses DB per-domain (analytics dulu — pemilik 19 panggilan) + ESLint boundary rule.
4. Naikkan coverage threshold ke 15%.

**90 hari — struktur besar:**
1. Pecah `GradePromotionModal` → `PhScheduleTab` → `AttendanceTab` → `ReportPage` mengikuti pola `mass-input/engine`.
2. Satukan stack ekspor ke `src/lib/export/`.
3. Offline parity semua mode input (§5.7) + dashboard cache baca-saja.
4. Restore drill backup + monitoring keberhasilan backup harian.
5. Naikkan coverage threshold ke 25% dengan budget per-folder.

---

## 6. Keputusan yang hanya pemilik proyek bisa putuskan

1. **Arah Q4:** polish menu existing (semua PRD aktif mengarah ke sini) atau mulai multi-tenancy? Realitas sudah menjawab "polish" — yang perlu adalah meresmikannya, memindahkan enterprise ke dokumen visi tanpa tanggal.
2. **Dua stack offline:** hapus `useOfflineSync` (murah, hilangkan kebingungan) atau jadikan stack tunggal menggantikan `useSyncQueue` (usaha besar, menggabungkan conflict resolution yang lebih matang)?
3. **WhatsApp:** channel utama apa (Fonnte vs Baileys VPS)? Lima dokumen fase tidak boleh lagi menjadi pengganti satu keputusan.
4. **`student_class_histories` baca-lebar:** disengaja untuk rapor historis, atau perlu difilter per peran?

---

## 7. Lampiran — sumber & verifikasi

- Analisis dimensi (scratch, gitignored): `.cache/agent-produk.md`, `.cache/agent-arsitektur.md`, `.cache/agent-kualitas.md`.
- Review kode resmi: [2026-11-16-review-proyek.md](2026-11-16-review-proyek.md) — termasuk perbaikan P1 yang sudah dilakukan hari ini.
- Verifikasi manual saya atas klaim agent: `useOfflineSync` dead code (rg), distribusi 111/57 panggilan `supabase.from()` (rg), klaim "data palsu" dashboard (rg `students[0]` — **tidak ditemukan lagi**), `--no-verify-jwt` ×3 (workflow), CSP `unsafe-inline` (`vercel.json:63`), `USING (true)` (migrasi `:156`), klaim coverage 80% di ROADMAP (rg).
- Angka yang TIDAK diverifikasi ulang: skor Lighthouse 62–64 dan ukuran bundle diambil apa adanya dari `docs/A11Y_LIGHTHOUSE_RESULTS.md` & `docs/BUNDLE_PERFORMANCE_REPORT.md` (keduanya tertanggal 2026-08-01).

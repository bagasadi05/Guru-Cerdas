# Review Proyek — Portal Guru

**Tanggal:** 16 November 2026
**Cakupan:** seluruh repo + 28 file yang belum di-commit di `main`
**Metode:** playbook `portal-guru` (ground in codebase → design check → quality gate → review dua sumbu)

---

## 1. Putusan

**Sehat dan layak lanjut. Tidak ada blocker (P0).** Ada 3 temuan P1, semuanya di lapisan `api/`, plus 9 temuan P2–P3.

Refactor yang sedang berjalan di working tree arahnya benar: satu modul guard menggantikan tiga salinan logika yang sama, auth admin diselaraskan dengan Edge Function, dan dua bug data nyata (queue offline yang menandai sukses tanpa sinkron, nama sheet Excel duplikat) diperbaiki dengan test.

Yang perlu dikerjakan sebelum rilis berikutnya: tiga temuan P1 di bawah — semuanya perubahan kecil dengan dampak keamanan yang tidak kecil.

---

## 2. Quality gate

| Gate | Perintah | Hasil |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **lulus**, exit 0 (~4 menit) |
| Lint (repo) | `eslint .` | **lulus**, 0 error, **517 warning**, exit 0 |
| Lint (file berubah) | `eslint <10 file>` | 0 error, 7 warning |
| Test | `npm test` | **2.925 / 2.930 lulus**, 5 gagal di 4 file |

Catatan hasil:

- **Kegagalan test bukan regresi.** Keempat file yang gagal — `tests/integration/Attendance.test.tsx`, `tests/unit/PerangkatAjarPage.documents.test.tsx` (2 kasus), `tests/unit/studentCsvDownload.test.ts`, `tests/unit/textSanitizer.test.ts` — semuanya **lulus saat dijalankan terpisah** (`4 passed`). Gejalanya timeout 15–45 detik pada suite paralel dengan total durasi 381 detik dan waktu import 1.178 detik. Mesin ini kelebihan beban, bukan kode yang salah.
- **Lint lokal lambat:** `eslint .` butuh ~15 menit. Penyebab utama: `src/services/database.types.ts` (117 KB, generated) dan folder non-sumber ikut dipindai.
- **Warning tidak pernah menggagalkan apa pun:** CI memakai `--max-warnings=-1` (`.github/workflows/ci.yml:17`), jadi 517 warning itu hanya angka.
- **Ambang coverage rendah:** 8% statement / 6% function (`vite.config.ts:305-310`), sesuai `docs/COVERAGE_BASELINE.md`. Gate ini mencegah keruntuhan, bukan mengukur kualitas.

---

## 3. Sumbu Standards

| ID | P | Temuan | Bukti | Dampak |
|---|---|---|---|---|
| S1 | **P1** | Kunci rate limit memuat `User-Agent` | `api/_requestGuard.ts:114-125` | Rotasi UA cukup untuk melewati limit. Setiap kombinasi IP+UA juga menambah entri `Map` yang tidak pernah dibersihkan (`:128`), jadi memori warm instance naik terus. |
| S2 | **P1** | `authenticateRequest` default `allowDevWithoutAuth: true` | `api/_auth.ts:18`; dipakai tanpa opsi di `api/gemini.ts:127` dan `api/groq.ts:105` | Bila `NODE_ENV`/`VERCEL_ENV` = `development`, endpoint AI menerima request tanpa token. Default-nya yang salah, bukan pemakaiannya. |
| S3 | **P1** | Allowlist origin memuat `https://*.vercel.app` | `api/_requestGuard.ts:29-35` | Deployment Vercel mana pun lolos cek origin, sehingga kontrol ini tidak lagi berfungsi sebagai lapisan kedua. |
| S4 | P2 | Dua implementasi rate limiter hidup berdampingan | `_requestGuard.createRateLimiter` vs `api/_documentExport.ts:78` | Perilaku berbeda (per-IP+UA vs per-user, ada/tanpa burst & Redis) tanpa catatan alasan. |
| S5 | P2 | `_requestGuard.ts` tanpa unit test | `rg "_requestGuard\|isOriginAllowed\|createRateLimiter" tests/` → nihil | Modul keamanan baru berisi regex wildcard, pencocokan host, dan burst counter — tiga area yang paling sering salah saat diubah. `tests/unit/apiAuth.test.ts` hanya menguji 403 dan jalur sukses. |
| S6 | P2 | `setSyncHandler` tidak bisa dilepas | `src/services/offline/offlineQueueService.ts:180`; registrasi di `src/hooks/useOfflineSync.ts:67-73` | Setelah hook unmount, handler tetap menunjuk closure lama; effect juga re-bind setiap `onConflict` berubah (inline callback → tiap render). |
| S7 | P2 | Handler queue memanggil `syncItem` langsung, melewati `sync()` | `src/hooks/useOfflineSync.ts:68` vs `:80-130` | Bookkeeping (`lastSyncTime`, toast, `syncInProgressRef`) dilewati untuk item yang diproses lewat `offlineQueue.add()`. Perlu dipastikan semua tabel yang di-queue punya jalur di `syncItem`; kalau tidak, item berubah dari "diam-diam sukses" menjadi "gagal dan menumpuk". |
| S8 | P3 | Auth admin = 2 request jaringan berurutan, tanpa cache | `api/_auth.ts:76-128` | Wajar pada 20 req/menit, jadi masalah bila helper ini dipakai endpoint ramai. Token juga di-parse ulang (`:94`) padahal sudah dibaca di `authenticateRequest`. |
| S9 | P3 | Cabang `OPTIONS` di `authenticateAdminRequest` tidak tercapai | `api/_auth.ts:77` vs `api/telegram.ts:54` | Kode mati: non-POST ditolak 405 sebelum auth dipanggil. |
| S10 | P3 | 209 `as any`, 55 `eslint-disable` di `src/` | `rg -c` pada `src/` | Utang tipe tidak terlihat karena warning tidak memblokir CI. |
| S11 | P3 | `database.types.ts` (generated) berubah 831+/393- tanpa header, ikut di-lint | `src/services/database.types.ts` | Diff 1.224 baris tidak bisa di-review manusia; tidak ada penanda "jangan diedit". |
| S12 | P3 | Artefak ikut ter-commit / laporan berserakan | `.lcp-measure/` (12 file), `a11y-report.md`, `ORIGINAL_REQUEST.md` di root | Sinyal bercampur dengan sumber; `.lcp-measure` jelas artefak pengukuran. |
| S13 | P3 | `AGENTS.md` menunjuk folder yang di-`.gitignore` | `AGENTS.md` → `.claude/skills/*`, `.agents/skills/*`; lihat `.gitignore` baris 130-137 | Di clone bersih, semua pointer skill di dokumen itu mati. |

---

## 4. Sumbu Spec — perubahan yang belum di-commit

### 4.1 Yang dikerjakan

| # | Perubahan | Penilaian |
|---|---|---|
| 1 | Ekstraksi `api/_requestGuard.ts` (190 baris) menggantikan tiga salinan `getRequestOrigin` / `isOriginAllowed` / `getClientKey` / rate limiter di `gemini.ts`, `groq.ts`, `telegram.ts` | **Bagus.** Lolos deletion test: hapus modul ini, kompleksitas muncul kembali di tiga tempat. ± 370 baris duplikat hilang. |
| 2 | `authenticateAdminRequest` + `telegram.ts` jadi admin-only | **Sesuai** dengan Edge Function `functions/telegram-proxy/index.ts:52`. Satu-satunya pemanggil klien adalah `useTelegramConfig` (uji notifikasi), dan fallback-nya juga admin-only — tidak memutus alur guru. |
| 3 | `isOriginAllowed` kini meloloskan request tanpa `Origin`/`Referer` bila `Host` cocok allowlist | **Perilaku berubah.** Dulu ditolak. Perlu konfirmasi bahwa ini disengaja: cek origin jadi lebih longgar untuk pemanggil non-browser. |
| 4 | `processQueue()` tanpa handler kini no-op | **Perbaikan nyata.** Dulu item ditandai `success` tanpa disinkronkan — data hilang diam-diam. Test regresi sudah ada di `tests/unit/offlineModularService.test.ts`. |
| 5 | Export Excel: sanitasi nama sheet, suffix unik, merge 8 kolom | **Perbaikan bug nyata.** Dua siswa bernama sama sebelumnya membuat workbook gagal dibuat. Test baru mengunci perilakunya. |
| 6 | `bintangPdfGenerator`: early-return saat 0 laporan, `await import('jspdf')` sekali sebelum loop | **Benar**, dan justru mengurangi kerja. Test `textSanitizer` yang menyentuh fungsi ini timeout di suite paralel, tapi lulus terpisah — beban mesin, bukan kode. |

### 4.2 Drift dokumentasi

- `PROJECT.md:28-29` menandai M2 dan M3 **`PLANNED`**, padahal fiturnya sudah ada di kode: penanganan `not-allowed` / `audio-capture` / `no-speech` di `src/components/pages/mass-input/engine/voicePorts.ts:177-189`, shortcut Space / Arrow / Ctrl+Z di `VoiceGradeModal.tsx:68-77`, dan 9 target sentuh ≥ 44 px. Status milestone perlu diperbarui, atau dokumen ini akan menyesatkan agent maupun kontributor berikutnya.
- Tidak ada `CONTEXT.md`, padahal playbook menyebutnya sebagai sumber istilah kanonik.
- 60+ file di root `docs/`, banyak berupa audit bertanggal tanpa indeks keputusan. `docs/index.md` tidak memetakan mana yang masih berlaku.

### 4.3 Catatan perilaku kecil

- `referenceNowMs` (`usePhScheduleDomain.ts:289`) dan `recentCutoffMs` (`TodayPhScheduleWidget.tsx:40`) dibekukan saat mount. Perbaikan ini menghindari pemanggilan `Date.now()` di dalam `useMemo`, tapi badge "baru" menjadi basi pada sesi yang terbuka lebih dari 24/72 jam. Dampaknya rendah; cukup dicatat sebagai pola.
- `authenticateAdminRequest` mengembalikan status 500 saat kredensial Supabase kosong, sementara `authenticateRequest` mengembalikan 401 tanpa `statusCode`. Dua jalur error yang berbeda untuk kondisi yang mirip.

---

## 5. Yang sudah baik dan sebaiknya dipertahankan

- **Typecheck bersih** pada 937 file sumber, tanpa satu pun `@ts-ignore` / `@ts-expect-error`.
- **203 file test** dan **140 migrasi SQL** dengan pola RLS konsisten (`is_admin_user`, `has_teacher_class_assignment`).
- **Skrip audit khusus** yang jarang ditemukan di proyek sebesar ini: `audit:mocks`, `audit:dead`, `audit:fonts`, `audit:schema`, `audit:hardcode-id`.
- **Rahasia tetap di server:** `.env` tidak ter-commit (`git ls-files .env` kosong), tidak ada service key di kode klien selain komentar penjelas di `useTelegramConfig.ts:22`.
- **Budaya diff:** commit terakhir berisi perbaikan sempit + test; refactor hari ini menghapus duplikasi, bukan menambah lapisan abstraksi.

---

## 6. Urutan tindakan

**P1 — sebelum rilis berikutnya**

1. S2: ubah default `allowDevWithoutAuth` menjadi `false`, minta `true` secara eksplisit di tempat yang memang butuh.
2. S1: kunci rate limit pakai IP (plus `userId` bila terautentikasi), dan bersihkan entri kedaluwarsa.
3. S3: hapus wildcard `*.vercel.app`, ganti dengan allowlist per-deployment.

**P2 — sprint ini**

4. S5: tulis test `_requestGuard` (origin cocok/tidak, wildcard, burst melewati batas, fallback Redis gagal).
5. S6 + S7: izinkan `setSyncHandler(undefined)` + cleanup effect; pastikan semua tabel yang di-queue punya jalur `syncItem`.
6. S4: satukan limiter `_documentExport` atau tulis alasan perbedaannya di komentar.
7. Stabilkan suite: naikkan `testTimeout` untuk file berat atau batasi `maxWorkers`, supaya hasil `npm test` bisa dipercaya tanpa menjalankan ulang manual.
8. Perbarui `PROJECT.md` (status M2/M3) dan tambahkan `CONTEXT.md` berisi istilah kanonik.

**P3 — backlog**

9. S8–S13: cache hasil cek admin, hapus cabang `OPTIONS` mati, turunkan `as any` secara bertahap, tambahkan header "generated" pada `database.types.ts` + ignore di ESLint, bersihkan artefak, perbaiki pointer skill di `AGENTS.md`.

---

## Lampiran — perintah yang dijalankan

```powershell
git status --short; git log --oneline -8; git diff --stat
npx tsc --noEmit                                  # exit 0
npm run lint                                      # exit 0, 517 warning
npx eslint api/_requestGuard.ts api/_auth.ts api/gemini.ts api/groq.ts `
  api/telegram.ts src/hooks/useOfflineSync.ts `
  src/services/offline/offlineQueueService.ts `
  src/services/violationExport.ts `
  src/components/schedule/engine/usePhScheduleDomain.ts `
  src/components/Layout.tsx                       # 0 error, 7 warning
npm test                                          # 2925 pass / 5 fail (4 file)
npx vitest run tests/integration/Attendance.test.tsx `
  tests/unit/PerangkatAjarPage.documents.test.tsx `
  tests/unit/studentCsvDownload.test.ts `
  tests/unit/textSanitizer.test.ts                # 4 file pass
```

Inventaris: 937 file `src`, 203 file test, 140 migrasi SQL, 15 modul halaman, 8 endpoint `api/`.

---

## 7. Status perbaikan (16 November 2026, sesi yang sama)

Temuan P1 dan beberapa P2 telah diperbaiki di working tree:

| ID | Status | Perubahan |
|---|---|---|
| S1 | ✅ | `getClientKey` kini IP saja (User-Agent dihapus); `checkRateLimit(req, auth.userId)` memakai budget per user untuk pemanggil terautentikasi; store di-prune saat ≥ 5.000 entri. Dipakai di `gemini.ts`, `groq.ts`, `telegram.ts`. |
| S2 | ✅ | `allowDevWithoutAuth` default mati — bypass dev hanya bila dipanggil eksplisit. Semua endpoint `api/` kini fail-closed di development. Dampak: pengujian `/api` lokal tanpa token kini 401. |
| S3 | ✅ | Wildcard `https://*.vercel.app` dihapus dari allowlist default; same-origin tetap lolos lewat pencocokan host. |
| S5 | ✅ | `tests/unit/requestGuard.test.ts` baru: origin same-host / env / wildcard / fallback host / malformed, kunci tak bisa dirotasi via UA, max+burst, reset window, budget per user, fallback Redis. `apiAuth.test.ts` diperbarui (bypass eksplisit + negative test). |
| S6 | ✅ | `setSyncHandler` mengembalikan disposer (identity-safe); `useOfflineSync` membersihkan handler saat unmount. |
| S9 | ✅ | Cabang `OPTIONS` mati dihapus dari `authenticateAdminRequest`. |
| S4 | ✅ (dok) | Alasan limiter `_documentExport` tetap terpisah ditulis di komentar. |
| S11 | ✅ (parsial) | `src/services/database.types.ts` di-ignore ESLint. Header "generated" belum ditambahkan (akan tertimpa saat regenerasi). |
| Drift | ✅ | `PROJECT.md`: M2 & M3 → COMPLETED (fitur terverifikasi di `voicePorts.ts:177-189`, `VoiceGradeModal.tsx:68-77`). M4 tetap PLANNED. |
| S7, S8, S10, S12, S13 | ⏳ | Sengaja belum: S7 butuh inventaris tabel queue; S8 (cache admin) berisiko stale; S10/S12/S13 utang tipe & kebersihan repo — masuk backlog. |

**Gate setelah perbaikan:** `tsc --noEmit` exit 0 · lint file berubah 0 error (4 warning `any` pra-eksisting) · 7 file test lulus (`requestGuard`, `apiAuth`, `offlineModularService`, `attendanceQueuePersistence`, `useAttendanceActions`, `quizPointsWriteGuard`, `violationExport`).

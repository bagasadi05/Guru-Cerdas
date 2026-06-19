# Sprint 10 — Stabilization & Reliability (Closure)

> Status: **Complete**. Tujuan sprint: menghilangkan kelas bug “layar blank setelah Back”, mengeraskan error boundary, mengaudit konsistensi routing, dan menambah jaring pengaman pengujian (unit + e2e) serta dasar CI.

## Ringkasan item

| ID | Item | Status | PR | Merge commit |
|----|------|--------|----|--------------|
| S10-1 | Hotfix blank-on-back (akar masalah animasi/transisi) | ✅ | #23 | `6f3f3008` |
| S10-2 | `PageTransition` exit-animation race fix | ✅ | #25 | `0598dcf1` |
| S10-3 | Pengerasan `ErrorBoundary` (auto-reset saat route berubah) + 6 unit test | ✅ | #26 | `f6ffb7a0` |
| S10-4 | Audit konsistensi routing | ✅ | #24 | `1c9a27f8` |
| S10-5 | E2E back-navigation (Playwright fungsional) + wiring CI | ✅ | #27 | `7af50519` |
| S10-6 | Bug bash + dokumen penutup (file ini) | ✅ | _PR ini_ | — |

## S10-3 — ErrorBoundary

- `ErrorBoundary` kini menerima prop `resetKey`. Saat `resetKey` berubah ketika boundary sedang dalam keadaan error, state error otomatis di-reset (`componentDidUpdate`).
- `AsyncErrorBoundary` membungkus tiap rute dan meneruskan `resetKey={location.pathname}`, sehingga berpindah rute menyembuhkan layar error tanpa reload manual.
- Pengujian: `src/components/ErrorBoundary.test.tsx` (render children, fallback kustom/standar, reset saat resetKey berubah, TIDAK reset saat resetKey sama, pemulihan via navigasi react-router).

## S10-5 — E2E back-navigation + CI

- `e2e/functional/back-navigation.spec.ts`: uji **fungsional** (assert DOM, bukan screenshot) → deterministik di runner Linux.
  - Mock auth (`localStorage['portal-guru-auth']` + `onboarding_completed`) dan Supabase REST/auth.
  - Skenario: `/dashboard` → `/siswa` → **Back** harus menampilkan `Aksi Cepat` (bukan blank) → **Forward** harus menampilkan `Budi Santoso`; plus 3× siklus back/forward.
- `playwright.functional.config.ts`: konfigurasi terpisah dari `playwright.config.ts` (visual-only, baseline `*-win32.png` yang false-fail di Linux). Single project `chromium`, build + `vite preview`, tanpa baseline screenshot.
- Script baru: `npm run test:e2e`.

### ⚠️ Temuan CI (perlu aksi manual)

- `.github/workflows/ci.yml` **sudah** memuat job yang menjalankan `tsc --noEmit`, `npm run lint`, `npm run test:coverage`, dan `build` pada event `pull_request`.
- Namun pemeriksaan PR aktual (PR #26) hanya menampilkan **“Vercel Preview Comments”** — **tidak ada job GitHub Actions yang berjalan sama sekali**. Indikasi kuat: **GitHub Actions dinonaktifkan di level repositori**.
- **Tindakan:** Settings → Actions → General → *Allow all actions and reusable workflows* → Save. Setelah itu `ci.yml` langsung menjadi gate setiap PR.
- **Workflow e2e:** `.github/workflows/e2e.yml` tidak dapat di-commit lewat token integrasi (butuh izin `workflows`). Tambahkan manual; isinya didokumentasikan di deskripsi PR S10-5.

## S10-6 — Bug bash (audit statik)

Karena lingkungan kerja tanpa akses jaringan keluar (tidak bisa menjalankan app/test), bug bash dilakukan sebagai **audit statik** terfokus pada penyebab umum ketidakstabilan UI: timer & event listener tanpa cleanup, dan pola transisi.

### Audit timer (`setInterval` / `setTimeout`)

| Lokasi | Hasil |
|--------|-------|
| `src/hooks/useClock.ts` | ✅ interval di-clear saat unmount |
| `src/hooks/useAutosave.ts` | ✅ debounce `setTimeout` + interval autosave keduanya di-clear |
| `src/hooks/useSessionTimeout.ts` | ✅ semua timer (`warning`/`logout`/`countdown`) + 4 event listener dibersihkan |
| `src/hooks/useTaskNotifications.ts` | ✅ `clearInterval` pada cleanup |
| `src/components/pages/admin/hooks.ts` | ✅ `clearInterval` pada cleanup |
| `src/utils/confetti.ts` | ✅ interval menghentikan dirinya saat animasi selesai |
| `src/services/errorHandling.ts` | ℹ️ singleton flush-interval (lifetime aplikasi) — dapat diterima |
| `src/services/CleanupService.ts` | ℹ️ interval level-modul (lifetime aplikasi) — dapat diterima |
| `src/services/networkResilience.ts` | ⚠️ **diperbaiki di sprint ini** (lihat bawah) |

### Temuan & perbaikan: `networkResilience.ts`

- **Masalah:** `startQueueProcessor()` memanggil `setInterval(…, 30000)` **tanpa menyimpan handle**, dan `initializeNetworkMonitoring()` mendaftarkan listener `online`/`offline` memakai `this.handleX.bind(this)` (fungsi baru tiap panggil) sehingga **tidak bisa di-`removeEventListener`**. Untuk singleton sepanjang lifetime aplikasi ini tidak menyebabkan kebocoran nyata bagi pengguna, tetapi **bocor di HMR dan pengujian** (instance baru menumpuk interval/listener).
- **Perbaikan:** simpan handle interval (`queueProcessorInterval`), simpan referensi listener ter-bind (`boundHandleOnline`/`boundHandleOffline`), dan tambah API publik **`destroy()`** untuk menghentikan interval + melepas listener. Tidak ada perubahan perilaku pada runtime normal.

### Audit pola transisi (`AnimatePresence`)

- 8 penggunaan `AnimatePresence` diperiksa (Modal, BottomSheet, FloatingActionMenu, CollapsibleSection, WarningBanner, ActionableRecommendation, InteractiveAttendanceChart, ChildDevelopmentAnalysisView). Semuanya membungkus konten yang **conditional/expandable lokal** (bukan transisi level-rute), jadi tidak terkait kelas bug blank-on-back yang sudah ditangani S10-1/S10-2 pada `PageTransition`.

## Risiko tersisa & tindak lanjut

1. **GitHub Actions OFF** — sampai diaktifkan, gate `tsc`/`test`/`build`/`e2e` belum benar-benar berjalan; verifikasi saat ini bergantung pada review + Vercel preview.
2. **`e2e.yml` belum ada** di repo (butuh penambahan manual karena batasan izin token).
3. **Baseline visual Playwright** masih `*-win32.png` → regenerasi di Linux bila ingin menjalankan suite visual di CI.
4. **Lighthouse/a11y** belum dijalankan ulang pasca perubahan Sprint 10.
5. **Cabang fitur lama** dapat dibersihkan setelah merge.

## Catatan verifikasi

Semua kode pada sprint ini di-review secara statik; karena Actions belum aktif dan lingkungan tanpa jaringan, **belum ada eksekusi CI** yang memvalidasi `tsc`/unit/e2e secara otomatis. Setelah Actions diaktifkan dan `e2e.yml` ditambahkan, jalankan ulang seluruh gate untuk konfirmasi akhir.

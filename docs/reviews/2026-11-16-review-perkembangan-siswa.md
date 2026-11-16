# Review Fitur Perkembangan Siswa — 16 November 2026

**Cakupan:** fitur "Perkembangan" di detail siswa (guru) + "Perkembangan Anak" di Portal
Orang Tua (`/portal/:studentId`). ±5.400 baris di 32 file:
`src/services/childDevelopmentAnalysis.ts` (900), `student-detail/child-development/**`
(±4.900: 2 hook, 16 komponen, 2 view, PDF export), `src/components/ui/ChildDevelopmentAnalytics.tsx` (574).
**Metode:** pembacaan mendalam 6 file utama (agent riset) + verifikasi silang manual atas
klaim kunci + jejak RLS di 140 migrasi.

---

## 1. Putusan

**Arsitekturnya sehat, keandalan datanya belum.** Struktur feature-slice rapi (hooks/types/
utils/views terpisah), keamanan portal benar (RPC SECURITY DEFINER ber-validasi
`access_code`, tabel analisis sudah RLS per `user_id`), dan output AI disanitasi sebelum
render. Masalah utamanya: **satu "perkembangan" dianalisis oleh dua engine yang berbeda**
(guru = AI, orang tua = hitungan lokal) dengan **rumus yang tidak pernah cocok satu sama
lain**, ditambah beberapa bug kecil yang menghasilkan angka/tampilan yang menyesatkan.

## 2. Peta fitur

```
GURU (detail siswa → tab Perkembangan)
  StudentDetailTabPanels.tsx:22 (lazy) → ChildDevelopmentAnalysisTab
    ├─ mode "single"      → useSingleChildAnalysis    (Gemini → cache 3 lapis → PDF)
    └─ mode "comparative" → useComparativeChildAnalysis (Gemini → PDF)
ORANG TUA (/portal/:studentId, sesi anon + kode akses)
  ParentPortalPage.tsx:727 → ChildDevelopmentAnalytics.tsx
    └─ engine lokal terpisah: hitung useMemo saja — TANPA AI, TANPA cache DB
```

- Data mentah bukan di-fetch fitur ini — props dari halaman induk (`academic_records`,
  `attendance`, `violations`, `quiz_points`).
- Analisis guru = Gemini (`generateGeminiJson`, namespace `json:child-analysis`) → disanitasi
  `sanitizeAnalysisData` → disimpan ke localStorage + tabel `student_development_analyses`
  (RLS "manage their own", `20260520200000`).
- Analisis orang tua = rumus lokal + template; hasil AI guru **tidak pernah** sampai ke orang tua.

## 3. Yang sudah baik

- Keamanan portal: satu-satunya jalur data yang benar-benar jalan adalah RPC
  `get_student_portal_data` / `get_student_portal_bintang` yang memvalidasi
  `access_code` di server (komentar `ParentPortalPage.tsx:149` jujur bahwa sesi anon).
- Tabel cache analisis sudah RLS per `user_id` — analisis guru tidak bisa dibaca siswa lain.
- Output AI disanitasi; ada modal konfirmasi regenerate; ada fallback offline bila kuota habis.
- Struktur folder mengikuti pola feature-slice; komponen kecil (ScoreRing, RadarChart, dst.)
  terdekomposisi dengan baik.

## 4. Temuan

| ID | P | Temuan | Bukti |
|---|---|---|---|
| CD1 | **P1** | **Regenerate itu ilusi:** pemanggilan Gemini tanpa `bypassCache`, jadi regen ≤2 menit pada data sama = cache hit → hasil lama ditulis ulang dengan `generatedAt` baru | `childDevelopmentAnalysis.ts:352,859` tanpa options; `geminiService.ts:142,397` menyediakan `bypassCache` |
| CD2 | **P1** | **Dua angka rata-rata berbeda dalam satu fitur:** badge UI pakai rata-rata-of-rata-rata mapel; prompt AI pakai rata semua record → bila jumlah penilaian per mapel timpang, angka yang dianalisis AI ≠ angka yang tampil | `useSingleChildAnalysis.ts:96-102` vs `childDevelopmentAnalysis.ts:277-279` |
| CD3 | **P1** | **Trend "palsu":** split-half array berdasarkan urutan indeks (komentar asli *"simulate based on record order"*), bukan perbandingan semester — dan ada 3 definisi trend berbeda (hook single, portal, hook komparatif) | `useSingleChildAnalysis.ts:67-89`; `ChildDevelopmentAnalytics.tsx`; `useComparativeChildAnalysis.ts` |
| CD4 | **P1** | **Ambang skor tidak bersumber satu tempat:** 85/75/65 (service fallback), 80/75/65 (subject tone), 85/75/<60 (badge guru), + attendance 95/85/75, keaktifan `min(quizTotal*5,100)`/`min(count*15,100)` — magic number tersebar ≥6 titik | `ChildDevelopmentAnalytics.tsx` (dua skala beda dalam satu file!), `useSingleChildAnalysis.ts:113-117`, `childDevelopmentAnalysis.ts:138` |
| CD5 | **P1** | **PDF hardcode sekolah:** halaman terakhir PDF komparatif selalu berkop `MI AL IRSYAD KOTA MADIUN` mengabaikan parameter — untuk sekolah lain kop salah | `childDevelopmentPdfExport.ts:749` |
| CD6 | P2 | **Shape mismatch cache:** `getLatestAnalysisFromDb` tidak memfilter `isComparative`/`semester_id` → baris komparatif (shape berbeda) bisa dimuat sebagai analisis single → render `undefined` | `childDevelopmentAnalysis.ts:421-445` vs save di `:610,742` |
| CD7 | P2 | **Race & redundansi:** kedua hook dipasang bersamaan walau satu tab aktif; load async tanpa abort; retry ganda (hook ≤3 × internal ≤3 ≈ 9 request); save = read-then-insert bukan upsert (bisa dua baris antar perangkat) | view `:29,38`; `useSingleChildAnalysis.ts:374-431`; `childDevelopmentAnalysis.ts:465-500` |
| CD8 | P2 | **Jalur fallback portal = dead code:** 9 query tabel langsung berjalan sebagai `anon` yang diblokir RLS — tidak pernah bisa sukses, hanya menambah latensi & menyesatkan maintainer | `ParentPortalPage.tsx:185-234`; komentar `:149` |
| CD9 | P2 | **PDF lain-lain:** penomoran bagian lompat (2→4, bagian 3 tak ada); label "(AI COMPLETED)" tercetak untuk hasil Offline Fallback; bullet komparatif diam-diam `slice(0,2)` | `childDevelopmentPdfExport.ts:489-694` |
| CD10 | P2 | **Duplikasi hook:** 97 baris identik posisi-ke-posisi (~20%; ±27% setelah normalisasi identifier), blok load/generate/save salinan rename | `useSingleChildAnalysis.ts` vs `useComparativeChildAnalysis.ts` |
| CD11 | P3 | **0 test** untuk fitur 5.400 baris (hanya `childDevelopmentPdfUtils.test.ts` 32 baris) — rumus & fallback padat logika, paling murah untuk dites | `tests/**` |
| CD12 | P3 | `ComparativeAnalysisView` 821 baris (radar SVG inline 2×, IIFE rekomendasi di render); PDF export 772 baris dengan pola sama seperti ±12 generator lain (kandidat `src/lib/export/` di F3.5) | `views/ComparativeAnalysisView.tsx`; `utils/childDevelopmentPdfExport.ts` |

**Gap produk (perlu keputusan, bukan kode):** orang tua melihat "perkembangan" versi
hitungan lokal, guru melihat versi AI — dua cerita berbeda untuk anak yang sama. Pilihan:
(1) tampilkan ringkasan analisis guru ke orang tua via RPC ber-validasi access code,
atau (2) sadari dua versi dan samakan angkanya minimal di level metrik (CD2/CD4).

## 5. Saran perbaikan (urut kerjakan)

**Quick win (±1 hari, semua kecil):**
1. CD1 — pass `bypassCache: true` saat regenerate (opsi sudah tersedia).
2. CD6 — filter `isComparative`/`semester_id` di pembacaan cache DB.
3. CD5 — pakai parameter `schoolName` di PDF; dinamiskakan label AI/Fallback; rapikan nomor.
4. CD8 — hapus `fetchPortalDataFallback` (jalur RPC sudah cukup; kode mati justru berbahaya).
5. CD7 sebagian — mount hook komparatif hanya saat tabnya aktif.

**Sprint berikut (sedang):**
6. CD4+CD2 — **stats engine bersama** satu modul (avg, attendance, keaktifan, ambang dari
   KKM/konfigurasi) dipakai service + 2 hook + portal — menutup semua desinkron sekaligus.
7. CD3 — trend per semester nyata (data sudah ada di hook komparatif) atau sembunyikan bila
   belum ada 1 semester data.
8. Migrasi 2 hook ke TanStack Query (`queryKey: ['child-analysis', studentId, semesterId]`)
   — hapus useEffect chain, race, dan refetch per mount.
9. Gabungkan dua hook jadi satu hook berparameter mode (−200 baris salinan).
10. CD11 — test vitest untuk stats engine + `generateFallbackAnalysis` + sanitasi PDF.

**Kerangka (ikut F3/F4):**
11. CD12 — PDF ini masuk `src/lib/export/` saat F3.5 (kop/tanda tangan kini dicopy di ±12
    generator); angkat `drawRadarChartInPDF` jadi helper bersama.
12. Keputusan produk: apakah orang tua melihat hasil analisis guru (via RPC access code).

## 6. Lampiran

- Detail kode lengkap: `.cache/agent-cd-kode.md` (scratch, gitignored).
- Verifikasi manual saya: `bypassCache` tak dipakai (rg), hardcode sekolah `:749` (rg),
  kedua hook terpasang (rg), RLS tabel analisis (migrasi `20260520200000`), fallback anon
  vs RLS (komentar `ParentPortalPage.tsx:149`).
- Yang tidak diperiksa: komponen kecil `child-development/components/*` satu per satu,
  perilaku proxy `/api/gemini` dan budget AI, RLS DDL detail.

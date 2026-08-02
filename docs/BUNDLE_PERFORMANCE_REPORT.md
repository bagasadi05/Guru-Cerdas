# Laporan Analisis Bundle Produksi — Perf 63

Tanggal: 2026-08-01
Metode: `ANALYZE=true vite build` (rollup-plugin-visualizer → `dist/stats.html`) + `node scripts/analyze-bundle.cjs` (BFS closure statis dari `dist/index.html` + graph `nodeMetas` visualizer).

---

## Ringkasan Eksekutif

**Initial load halaman login = 1.084 KiB raw / 322,9 KiB gzip (6 chunk).** Lima chunk terbesar menguasai ~96% payload gzip. **Temuan tunggal terbesar: `vendor-pdf` (jsPDF + autotable, 133,8 KB gzip = 40,5% dari total) ikut terunduh saat login padahal jsPDF tidak dipakai sama sekali di halaman login** — ini artifact modulepreload Vite, bukan bug import di kode.

## A. Initial Load Closure (dari dist/index.html)

Semua yang benar-benar diunduh browser saat membuka halaman login (`/` dan `/guru-login`):

| # | Chunk | Isi | Raw | Gzip | % gzip total |
|---|-------|-----|-----|------|:---:|
| 1 | `vendor-pdf` | jsPDF + jspdf-autotable | 417,6 KB | **133,8 KB** | **40,5%** |
| 2 | `index-DMJGbYjz` | App shell (router, providers) | 236,9 KB | 66,7 KB | 20,2% |
| 3 | `vendor-react` | react/react-dom/router | 163,2 KB | 53,3 KB | 16,1% |
| 4 | `vendor-supabase` | supabase-js | 206,2 KB | 51,7 KB | 15,6% |
| 5 | `vendor-query` | @tanstack/react-query | 45,1 KB | 13,0 KB | 3,9% |
| — | `vendor-icons` | lucide-react | 41,0 KB | 12,2 KB | 3,7% |
| | **TOTAL** | | **1.084 KiB** | **322,9 KiB** | 100% |

*Urutan tabel diurutkan berdasarkan gzip (metrik transfer). Script Section B mengurutkan berdasarkan raw, sehingga posisi `vendor-supabase`/`vendor-react` bisa tertukar — keduanya tetap masuk top-5.*

## B. Root Cause vendor-pdf di Initial Load (Temuan Kunci)

**Fakta terverifikasi dari 3 sumber:**

1. **Source grep**: Tidak ada satupun file `src/` yang statis meng-import jspdf. Semua referensi adalah `import type` (terhapus saat compile) atau `await import('jspdf')` (dinamis). Pelacakan graph visualizer mengonfirmasi hanya **2 dynamic-import sites**: `src/utils/dynamicImports.ts` dan `src/services/bintangPdfGenerator.ts`.
2. **dist/index.html**: berisi `<link rel="modulepreload" href="/assets/js/vendor-pdf-*.js">` — browser **men-download** chunk ini saat page load.
3. **Entry chunk**: berisi `import{_ as a}from"./vendor-pdf-*.js"` dengan **0 pemakaian binding** (`a`) — import statis mati yang dihasilkan Vite, bukan dari kode kita.

**Mekanisme**: `await import('jspdf')` berada di `dynamicImports.ts` / `bintangPdfGenerator.ts` — modul yang **tidak** ada di static closure entry (BFS Section A hanya 6 chunk), tapi *dynamic-import jspdf berada dalam rantai modul yang Vite anggap bagian dari initial module graph*. Vite lalu *modulepreload* chunk hasil dynamic-import itu — menghasilkan link `<link rel="modulepreload">` di index.html + import statis mati `import{_ as a}` di entry (binding tak terpakai). Akibatnya jsPDF (417,6 KB raw) ikut diunduh saat login walau eksekusinya ditunda.

**Kesimpulan**: ini **bukan** regresi import-hygiene — `manualChunks` sudah benar memisahkan export libs, dan semua pemakaian sudah dinamis. Ini perilaku default Vite yang *over-eager* dalam mempreload.

## C. Chunk Terbesar di Seluruh Bundle (termasuk lazy)

| Chunk | Raw | Gzip | Di initial load? |
|-------|-----|------|:---:|
| `vendor-excel` (exceljs) | 931,8 KB | 256,3 KB | ❌ lazy (benar) |
| `index-DtdxIQXE` (chunk gabungan) | 478,9 KB | 152,6 KB | ❌ lazy |
| `vendor-pdf` (jsPDF) | 417,6 KB | 133,8 KB | ⚠️ **YA — salah** |
| `index-DMJGbYjz` (shell) | 236,9 KB | 66,7 KB | ✅ YA (wajar) |
| `vendor-supabase` | 206,2 KB | 51,7 KB | ✅ YA (wajar, auth) |
| `vendor-canvas` (html2canvas) | 199,6 KB | 46,4 KB | ❌ lazy (benar) |
| `vendor-framer` (framer-motion) | 184,9 KB | 60,2 KB | ❌ lazy (benar) |
| `vendor-react` | 163,2 KB | 53,3 KB | ✅ YA (wajar) |
| `MassInputPage` | 158,9 KB | 40,3 KB | ❌ lazy |
| `index.es` | 156,5 KB | 51,4 KB | ❌ lazy |

✅ **Yang sudah benar**: exceljs (256 KB gzip), html2canvas, framer-motion semuanya lazy — tidak ikut di login. Arsitektur code-split dasar sudah bagus.

## D. Rekomendasi Code-Split (urut dampak)

### 1. 🎯 Keluarkan `vendor-pdf` dari initial load (dampak terbesar)
Hemat **133,8 KB gzip = 41% payload JS login**. Estimasi: dengan throttle 10 Mbps (kondisi LHCI), penghematan transfer ≈ 0,1–0,15 s FCP/LCP + parse 417 KB raw lebih sedikit di device low-end.

Opsi implementasi (urut keandalan):
- **a. `build.modulePreload.resolveDependencies`** di `vite.config.ts` — filter chunk export-libs (`vendor-pdf`, `vendor-excel`, `vendor-canvas`) keluar dari daftar preload. Cepat, 1 tempat, tapi perlu diverifikasi tidak memecah caching navigasi.
- **b. Putuskan jangkauan `dynamicImports.ts` dari entry graph** — pastikan tidak ada util shell yang meng-import `dynamicImports`/`pdfHeaderUtils`/`exportUtils` secara statis; pindahkan panggilan `getJspdf()` ke dalam lazy route chunks saja. Lebih invasif, tapi root-cause murni.
- **c. Verifikasi**: setelah fix, `node scripts/analyze-bundle.cjs` → `vendor-pdf` tidak lagi muncul di Section A, lalu ukur ulang LHCI.

### 2. Teliti `index-DtdxIQXE` (152,6 KB gzip, lazy terbesar)
Chunk gabungan ini menampung banyak halaman/fitur. Cek via visualizer: jika mencampur fitur jarang dipakai (AI, analitik), pecah per-route.

### 3. App shell `index-DMJGbYjz` (66,7 KB gzip)
Sudah di initial load (wajar), tapi audit: apakah provider/sidebar berat bisa lazy-load (mis. AI providers, help center).

### 4. Pertahankan yang sudah benar
`vendor-excel`/`vendor-canvas`/`vendor-framer` harus tetap lazy. Jangan pernah menambahkan import statis dari export libs — gunakan `dynamicImports.ts`.

## E. Catatan Jujur

- Rekomendasi #1 menghilangkan 40% payload JS login — **arah yang benar dan berdampak nyata**, tapi jangan diklaim menjamin skor perf spesifik (perf 63 dipengaruhi transfer bundle besar secara keseluruhan + precache PWA 2002 KiB). Ukur ulang setelah fix.
- `docs/A11Y_LIGHTHOUSE_RESULTS.md` mencatat perf 62–64 di 4 halaman dengan TBT 0 ms & CLS 0 — dominasi penyebab adalah **transfer size**, jadi pengurangan JS initial adalah leverage utama.

## F. Cara Mengulang Audit

```bash
npm run analyze          # build + visualizer -> dist/stats.html
node scripts/analyze-bundle.cjs            # laporan lengkap (A–D)
node scripts/analyze-bundle.cjs --lib exceljs   # lacak lib lain
```

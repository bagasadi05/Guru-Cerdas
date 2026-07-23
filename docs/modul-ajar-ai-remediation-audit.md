# Audit Pipeline AI Modul Ajar — Baseline & Remediasi (FASE R0)

**Baseline Environment**:
- Repository: `bagasadi05/Guru-Cerdas`
- Branch: `main`
- Commit awal: `0c5c2da1a76b436e5b7ff2ef51dd36d73253a804`
- Working tree: Clean (hanya `.claude/settings.local.json` untracked)

---

## Ringkasan Temuan Audit Wajib (10 Poin)

### 1. `ref_boilerplate_topik` Schema & `konten_json`
- **Kondisi Database (`supabase/migrations/`)**: Tabel `ref_boilerplate_topik` **TIDAK memiliki** kolom bernama `konten_json`.
- **Kondisi Codebase**:
  - `supabase/functions/modul-ajar-ai-worker/index.ts` (L141) mencoba melakukan `insert` dengan properti `konten_json: result.data`.
  - `src/components/pages/admin/ModulAjarBankTab.tsx` (L116) mencoba membaca `item.konten_json`.
- **Dampak**: Semua perintah insert worker ke database gagal dengan Postgres error: `column "konten_json" of relation "ref_boilerplate_topik" does not exist`.

### 2. Kolom `NOT NULL` Wajib pada `ref_boilerplate_topik`
- **Definisi Tabel**: Kolom `mata_pelajaran`, `topik`, `tujuan_pembelajaran`, `pemahaman_bermakna`, `pertanyaan_pemantik`, `lkpd_tugas`, `soal_evaluasi`, `pengayaan`, `remedial`, `daftar_pustaka`, dan `content_status` memiliki batasan `NOT NULL`.
- **Worker Payload**: Worker saat ini hanya mengirim `fase`, `mata_pelajaran`, `topik`, `konten_json`, `content_status`, `request_fingerprint`, `generated_by_provider`, `generated_by_model`, `prompt_version`, `generation_metadata`.
- **Dampak**: Worker **tidak** mengisi `lkpd_tugas` dan `soal_evaluasi` (yang berupa `text NOT NULL` tanpa default value), sehingga insert ditolak oleh PostgreSQL constraint violation.

### 3. Reproduksi Payload Insert Worker terhadap Schema Aktual
- **Fakta**: Insert worker ke `ref_boilerplate_topik` pasti mengalami runtime failure di level PostgreSQL baik karena `konten_json` yang tidak eksis maupun karena pelanggaran `NOT NULL` pada `lkpd_tugas` & `soal_evaluasi`.

### 4. Konkurensi & Subskripsi Job Multi-Pengguna (Guru A & Guru B)
- **Logika RPC**: `enqueue_modul_ajar_ai_job(p_input_json, p_request_fingerprint)` dijalankan sebagai `SECURITY DEFINER`.
- **Temuan**: Jika Guru A mengantrekan permintaan dengan `request_fingerprint = X`, job dibuat dengan `requested_by = Guru A`. Jika Guru B kemudian mengirim `request_fingerprint = X` yang sama saat job masih aktif, RPC mengembalikan row job milik Guru A kepada Guru B.
- **Masalah RLS**: Kebijakan RLS di `ai_content_jobs` hanya mengizinkan `requested_by = auth.uid()`. Sehingga ketika Guru B mencoba mem-polling atau mendengarkan status `job.id` tersebut via Supabase JS Client, RLS memblokir query Guru B. Guru B tidak pernah menerima hasil job.

### 5. Kebijakan RLS Admin (UPDATE / Cancel / Retry Job)
- **Fakta**: RLS pada `ai_content_jobs` untuk pengguna `authenticated` berpangkat admin hanya memiliki `FOR SELECT USING (is_admin_user(auth.uid()))`.
- **Masalah**: Di `ModulAjarBankTab.tsx`, admin memanggil `.update({ status: 'cancelled' }).eq('id', jobId)`. Karena tidak ada kebijakan `UPDATE` untuk admin di `ai_content_jobs` (hanya `service_role` yang memiliki `FOR ALL`), perintah update dari UI Admin diam-diam diabaikan oleh Supabase RLS.

### 6. Scoping Cache Guru (Draft vs Verified)
- **Logika Saat Ini**: `modulAjarAiService.ts` pada metode `checkCacheHit` memeriksa `.in('content_status', ['draft_ai', 'draft_manual', 'verified'])`.
- **Masalah**: Status `draft_ai` dan `draft_manual` yang belum ditinjau/diverifikasi oleh admin atau pengguna dianggap sebagai *cache hit* publik untuk guru lain.

### 7. Pemulihan Job Setelah Refresh Browser
- **Fakta**: Pada `ModulAjarCreatorPage.tsx` / `useModulAjarAiJob.ts`, `activeJobId` hanya disimpan di memori/state React lokal.
- **Masalah**: Jika guru me-refresh tab saat job sedang `processing`, status di UI ter-reset menjadi `idle` dan progress hilang dari pandangan guru.

### 8. Penanganan Sintaks Pembelajaran Kosong
- **Fakta**: Jika tabel `ref_sintaks_kegiatan` atau `ref_model_pembelajaran` tidak memiliki sintaks untuk model tertentu, `ModulAjarCreatorPage.tsx` memunculkan `alert('Sintaks belum diatur')` dan membatalkan proses perancangan Modul Ajar.
- **Masalah**: Kekosongan sintaks di database menjadi *hard blocker* bagi guru.

### 9. Type Safety & Workaround Typescript
- **Temuan Workaround**:
  - `src/services/modulAjarAiService.ts` menggunakan `(supabase as any)` di 5 lokasi.
  - `src/components/pages/admin/ModulAjarBankTab.tsx` menggunakan `(supabase as any)` di 4 lokasi.
  - `src/components/pages/modul-ajar/ModulAjarCreatorPage.tsx` menggunakan `(queueStatus as string)`.
  - `tests/unit/aiProviderRouter.test.ts` memiliki `// @ts-nocheck`.
  - `tsconfig.json` mengecualikan folder `"supabase"` dan `"tests"`.

### 10. Status Baseline Quality Gates
- **`npx tsc --noEmit`**: PASS (karena `tests` dan `supabase` dieksklusi dari `tsconfig.json`).
- **`npm run build`**: PASS (Vite production build berhasil dalam 1m 15s).
- **`npm run test`**: Berjalan via Vitest.

---

## Kesimpulan Baseline & Rekomendasi Remediasi

Seluruh temuan di atas mengonfirmasi bahwa arsitektur perancangan AI Modul Ajar saat ini membutuhkan langkah-langkah perbaikan terstruktur sesuai rencana remediasi (FASE R1 – FASE R8).

Dokumen ini dibuat tanpa mengubah kode aplikasi utama.

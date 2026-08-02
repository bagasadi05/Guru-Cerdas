# 🚦 Rencana Aman: Apply Pending Migrations ke Live DB (`supabase db push`)

**Tanggal:** 2026-08-01
**Proyek:** `fddvcyqbfqydvsfujcxd` (linked via `npx supabase link`)
**Status:** RENCANA — belum dieksekusi. Eksekusi `db push` ke production **hanya** setelah checklist di bawah hijau dan mendapat persetujuan eksplisit.

---

## 1. Ringkasan

`npx supabase migration list` menemukan **15 migration pending** (ada lokal, belum di remote):

| # | Migration | Baris | Risiko |
|---|---|---|---|
| 1 | `20260715200000_create_ai_insights` | 40 | Rendah |
| 2 | `20260716000000_create_ai_generation_queue` | 34 | Rendah |
| 3 | `20260717000000_harden_security_definer_functions_and_rls` | 267 | **Tinggi** (REVOKE PUBLIC + DROP/RECREATE policy) |
| 4 | `20260722000000_allow_homeroom_update_students` | 32 | Rendah |
| 5 | `20260722150000_modul_ajar_database_driven` | 132 | **Tinggi** (CREATE 6 tabel ref + ALTER; target yang diminta) |
| 6 | `20260722150100_seed_modul_ajar_data` | 799 | Sedang (seed besar) |
| 7 | `20260722160000_fix_sintaks_kegiatan_content` | 371 | Sedang (UPDATE konten) |
| 8 | `20260722170000_update_kbc_materi_insersi_and_generation_method` | 38 | Rendah |
| 9 | `20260722180000_seed_comprehensive_modul_ajar_bank` | 335 | Sedang (seed) |
| 10 | `20260722190000_p2_constraints_and_tp_seed` | 12 | Rendah |
| 11 | `20260722200000_create_modul_ajar_ai_pipeline` | 411 | **Tinggi** (REVOKE EXECUTE + DROP/RECREATE policy) |
| 12 | `20260723000000_remediate_modul_ajar_ai_schema` | 39 | Sedang |
| 13 | `20260723010000_remediate_ai_job_ownership_and_rls` | 11 | Sedang (DROP policy) |
| 14 | `20260801000000_make_quiz_points_subject_nullable` | 11 | Rendah (ALTER DROP NOT NULL; target yang diminta) |
| 15 | `20260802000000_fix_rls_ai_generation_attempts_and_ref_subject_alias` | 50 | Sedang (DROP/RECREATE policy) |

### ⚠️ Temuan kritis dari investigasi
1. **Bukan cuma 2 migration** — `20260722150000` + `20260801000000` hanyalah 2 dari 15 yang pending.
2. **Ada gap urutan di remote**: `20260726140628_normalize_subject_names` **sudah ter-apply di remote**, padahal 13 migration sebelum-nya belum. Artinya live DB punya state campuran — `ref_subject_alias` (dibuat di `20260726140628`) **sudah ada**, tapi tabel modul-ajar dari `20260722150000` belum.
3. **Dependensi terverifikasi aman**:
   - `ref_capaian_pembelajaran` → HTTP 200 (ADA di live DB) ✅ — FK target `20260722150000`
   - `ref_model_pembelajaran` → HTTP 200 (ADA) ✅ — ALTER target
   - `is_admin_user()` → REST 404 wajar (fungsi, bukan tabel) — didefinisikan di migration yang sudah ter-apply (`20260424093000` dkk) ✅
4. **Tidak ada `supabase/config.toml`** di repo — CLI memakai project linked + token dari `.env`. Pastikan `SUPABASE_ACCESS_TOKEN` & `SUPABASE_PROJECT_REF` tersedia (sudah ada di `.env`).

---

## 2. Checklist Verifikasi PRA-EKSEKUSI (wajib hijau semua)

- [ ] **A. Branch & working tree bersih** — `git status` bersih; tidak ada migration baru yang ditambal di tengah jalan.
- [ ] **B. Back up live DB dulu** (lihat §3) — hasil restore diuji bisa dibuka.
- [ ] **C. Dry-run db push** (lihat §4) — output tidak ada error sintaks/dependensi.
- [ ] **D. Sanity live DB** — query REST berikut harus 200/404-wajar:
  - `ref_capaian_pembelajaran` → 200
  - `ref_model_pembelajaran` → 200
  - `ref_subject_alias` → 200 (sudah ada dari `20260726140628`)
- [ ] **E. Cek env** — `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL` valid; project linked (`npx supabase projects list` menampilkan project).
- [ ] **E2. Password DB WAJIB ada** — `.env` saat ini TIDAK punya `SUPABASE_DB_PASSWORD`. `db push` butuh koneksi langsung ke DB (bukan cuma token) dan akan prompt interaktif yang bisa menggantung di shell non-interaktif. **Set `SUPABASE_DB_PASSWORD` di `.env` (atau siapkan `--db-url` pooler) SEBELUM eksekusi.**
- [ ] **F. Window waktu** — eksekusi di luar jam operasional (mis. malam/Jumat sore sebelum libur). Seed `20260722150100` (799 baris) + `20260722180000` (335 baris) berpotensi menambah durasi; siapkan timeout CLI besar (mis. 300s+).
- [ ] **G. Informasi tim** — kabari tim (kepala madrasah/admin) bahwa ada maintenance singkat; fitur Modul Ajar AI & BINTANG akan berfungsi penuh setelahnya.

---

## 3. Backup Live DB (SEBELUM apa pun)

Supabase sudah punya backup harian otomatis (PITR), tapi untuk lapis keamanan ekstra:

```bash
# Opsi A — pg_dump via pooler (butuh password DB dari dashboard Supabase)
pg_dump "postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
  --schema=public --no-owner --no-acl > backup_live_$(date +%Y%m%d_%H%M).sql

# Opsi B — snapshot dari dashboard Supabase (Database → Backups → Take a manual backup)
# (rekomendasi: lakukan ini, lebih mudah diverifikasi)
```

**Verifikasi backup:** pastikan file `.sql` tidak kosong dan punya `CREATE TABLE` — `head -20` file; ukuran > 0.

---

## 4. Dry-Run (TANPA menulis ke live DB)

```bash
cd "E:\Coding\Guru-Cerdas"
set -a && . ./.env && set +a

# Dry-run: hanya menampilkan SQL yang akan dijalankan, tanpa eksekusi
npx supabase db push --dry-run
```

Periksa output:
- [ ] 15 migration pending tampil dalam urutan timestamp.
- [ ] Tidak ada `ERROR` sintaks.
- [ ] Statement `ALTER TABLE public.quiz_points ALTER COLUMN subject DROP NOT NULL` tampil (migration #14).

> Catatan: `db push` juga butuh password DB saat koneksi langsung (bukan hanya token). Jika prompt muncul, masukkan password DB dari dashboard Supabase (Database → Connect → Session pooler).

---

## 5. Eksekusi (SETELAH checklist §2 hijau)

```bash
cd "E:\Coding\Guru-Cerdas"
set -a && . ./.env && set +a

# Apply semua migration pending dalam urutan timestamp
npx supabase db push
```

- Gunakan `timeout_seconds` besar (≥ 600) karena ada 2 file seed.
- Jangan jalankan perintah lain yang menyentuh DB selama proses.
- Simpan log output untuk referensi.

### ⚠️ Failure mode: aplikasi parsial
15 migration dijalankan berurutan dalam satu proses. **Jika salah satu gagal di tengah** (mis. seed 799 baris timeout, error constraint), CLI berhenti dan live DB berada di **state parsial** — migration 1–N ter-apply, sisanya belum. Jangan panik & jangan asumsi rollback penuh:

1. Baca baris error di log — itu menunjukkan titik kegagalan persis.
2. Jalankan `npx supabase migration list` → lihat mana yang sudah masuk ke Remote vs masih pending.
3. Ulangi `npx supabase db push --dry-run` untuk memastikan migration yang tersisa masih valid di state saat ini.
4. Umumnya aman menjalankan `db push` ulang (migration sudah ter-apply di-skip otomatis), KECUALI kegagalan karena data conflict — dalam kasus itu evaluasi manual sebelum lanjut.
5. **JANGAN pernah apply sisa migration satu-per-satu secara manual/out-of-order.** Contoh: `20260802000000` meng-ALTER `ai_generation_attempts` & mereferensikan `ai_content_jobs` — keduanya dibuat oleh `20260722200000` (juga pending). Apply manual `20260802000000` tanpa `20260722200000` akan gagal. Selalu ulangi `db push` agar urutan timestamp terjaga otomatis.

---

## 6. Checklist Verifikasi PASCA-EKSEKUSI (wajib hijau semua)

- [ ] **A. Migration list** — `npx supabase migration list` → kolom Remote semua terisi, tidak ada pending tersisa.
- [ ] **B. 2 tabel missing muncul** — REST:
  - `ref_bank_tp_iktp` → HTTP 200 (sebelumnya 404)
  - `ref_rubrik_template` → HTTP 200 (sebelumnya 404)
- [ ] **C. quiz_points.subject nullable** — `npx supabase gen types typescript` → `subject: string | null` (bukan `string`).
- [ ] **D. `npm run audit:schema`** → MISSING TABLE turun dari 2 → 0 (setelah types diregen sesuai langkah E).
- [ ] **E. Sinkronkan types** — regenerate `src/services/database.types.ts` dari live DB (lihat catatan §7), lalu `npx tsc --noEmit` 0 error.
- [ ] **F. Vitest** — `npx vitest run` (minimal `src/tests/integration.test.ts` + test soft-delete) tetap hijau.
- [ ] **G. Smoke test app** — login guru biasa (pastikan REVOKE PUBLIC di migration #3 tidak memecah fungsi yang dipakai app: `get_user_role`, `sync_users_to_roles`, `bulk_insert_grades`, `update_grade_with_version`), buka halaman Modul Ajar (query `ref_rubrik_template`/`ref_bank_tp_iktp` jalan), buka Dashboard BINTANG (assign `subject: null` diterima).
- [ ] **G2. Smoke test AI Modul Ajar** — migration #11 (`20260722200000`) `REVOKE EXECUTE` pada `claim_next_modul_ajar_ai_job`/`release_stale_modul_ajar_ai_jobs` dari PUBLIC/anon/authenticated. Membuka halaman saja TIDAK cukup — **trigger satu generasi Modul Ajar AI** (atau verifikasi fungsi masih callable oleh role authenticated) karena ini fungsi paling rentan pecah oleh REVOKE.
- [ ] **H. Smoke test portal/anon** — `REVOKE ALL FROM PUBLIC` di migration #3 menyentuh fungsi security-definer; komentar `20260416120000_harden_core_teacher_rls.sql` menyebut portal parent sengaja bergantung pada SECURITY DEFINER RPC + public announcements. **Wajib** uji: buka `/portal/:studentId` dengan kode akses siswa → data portal (laporan, absensi, pengumuman) harus tetap tampil. Kalau pecah, indikasi RPC portal ikut ter-REVOKE — segera rollback.

---

## 7. Rollback Plan (jika ada regresi)

Migration bersifat **idempotent / additive** di sebagian besar kasus (CREATE TABLE, ADD COLUMN, DROP NOT NULL), sehingga rollback manual relatif aman:

| Migration | Rollback |
|---|---|
| `20260722150000` + seed terkait | `DROP TABLE IF EXISTS public.ref_bank_tp_iktp, ref_rubrik_template, ref_sintaks_kegiatan, ref_boilerplate_topik, ref_tema_kbc, ref_materi_insersi CASCADE;` + `ALTER TABLE public.ref_capaian_pembelajaran DROP COLUMN IF EXISTS elemen, DROP COLUMN IF EXISTS sumber_regulasi, DROP COLUMN IF EXISTS tahun, DROP COLUMN IF EXISTS is_verified;` + `ALTER TABLE public.ref_model_pembelajaran DROP COLUMN IF EXISTS kategori, DROP COLUMN IF EXISTS sumber, DROP COLUMN IF EXISTS cocok_untuk, DROP COLUMN IF EXISTS kelebihan, DROP COLUMN IF EXISTS kekurangan;` |
| `20260801000000` | `ALTER TABLE quiz_points ALTER COLUMN subject SET NOT NULL;` (hanya jika TIDAK ada baris NULL; cek dulu: `SELECT count(*) FROM quiz_points WHERE subject IS NULL`) |
| `20260717000000` / `20260722200000` / `20260802000000` | Policy yang di-DROP di-recreate dengan kondisi baru oleh migration tsb; migration berikutnya **tidak menjamin** nama/nilai policy lama. Rollback policy yang aman = **restore dari backup §3** |
| Semua kasus | **Restore backup** (paling aman & menyeluruh) |

**Aturan:** jangan rollback sebagian-sendiri; jika ragu, restore penuh dari backup.

---

## 8. Rekomendasi Tambahan (pasca sukses)

1. **Buat `supabase/config.toml`** agar project tidak bergantung pada env token saja.
2. **Perbaiki gap urutan** — dokumentasikan bahwa `20260726140628` ter-apply lebih dulu dari pendahulunya; hindari apply migration acak via dashboard.
3. **Jadwalkan `db push` berkala** (mis. di deploy pipeline) supaya drift tidak menumpuk seperti sekarang.
4. Setelah live DB sinkron, **regenerate `database.types.ts`** dan hapus catatan "missing table" dari `docs/A11Y_LIGHTHOUSE_RESULTS.md` jika ada.

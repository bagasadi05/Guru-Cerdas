# Plan Hardening Database Supabase — 3 Oktober 2026

Disusun dengan kerangka *migration-architect*: tiap fase punya pra-cek, perubahan, gerbang validasi, dan rollback.
Semua fakta di bawah diambil dari database produksi lewat query baca saja pada 3 Oktober 2026.

**Batasan:** tidak ada tabel, kolom, atau baris data yang dihapus. Yang berubah hanya izin fungsi, konfigurasi fungsi, dan index baru.

## Status eksekusi (3 Oktober 2026)

Fase 0–5 sudah diterapkan ke produksi, dan semua gerbang lolos. Fase 6 dan 7 belum.

| Fase | Migrasi | Hasil gerbang |
|---|---|---|
| 0 | `supabase/rollback/2026-10-03_function_acl_snapshot.sql` | Snapshot 200+ baris izin tersimpan |
| 1 | `20261003145041_revoke_anon_non_portal_functions` | Sebagai `anon`: `get_student_directory`/`get_active_classes` → 401 `permission denied`; RPC portal → 200; query tabel langsung → 200 `[]` (tidak error) |
| 2 | `20261003145142_restrict_server_only_functions` | `anon` dan `authenticated` ditolak; `postgres` (cron/trigger) dan `service_role` tetap bisa |
| 3 | `20261003145204_retire_broken_grade_rpcs` | Tidak ada pemanggil di aplikasi; fungsi tetap ada |
| 4 | `20261003145237_pin_function_search_path` | Insert uji `quiz_points` dan `attendance` (selalu dibatalkan): `semester_id` terisi, push masuk antrean pg_net; 0 baris tersisa |
| 5 | `20261003145352_index_unindexed_foreign_keys` | 43 index dibuat |

Advisor sesudah eksekusi:
- `anon_security_definer_function_executable`: 55 → 22. Sisanya persis RPC portal dan helper RLS yang sengaja dipertahankan.
- `authenticated_security_definer_function_executable`: 57 → 45.
- `function_search_path_mutable`: 24 → 0.
- `unindexed_foreign_keys`: 43 → 0.
- `unused_index` naik 34 → 73. Ini karena 43 index baru belum terpakai query apa pun. Jangan dihapus berdasarkan angka ini; evaluasi ulang setelah beberapa minggu.

Jumlah baris sebelum dan sesudah sama persis: siswa 617, absensi 31.148, nilai 2.460, pelanggaran 1.224, poin keaktifan 5.855, rapor Bintang 722, komunikasi 6, `user_roles` 50.

Pemantauan 4 Oktober: backup `daily-r2-backup` berhasil (200), tidak ada error baru akibat hardening. Notifikasi push ternyata **sudah rusak sebelum hardening**; lihat bagian "Perbaikan lanjutan 4 Oktober".

### Fase 6 — ditunda, dengan alasan teknis
Simulasi di transaksi yang dibatalkan menunjukkan bahwa mencabut `anon` dari default privileges per-schema tidak cukup. Fungsi baru tetap mendapat `EXECUTE` untuk `PUBLIC` (dan `anon` adalah anggota `PUBLIC`), karena default per-schema hanya bisa menambah izin global, tidak bisa mencabutnya.

Satu-satunya cara adalah mencabut `PUBLIC` secara global untuk role `postgres`. Itu ikut berlaku untuk fungsi ekstensi yang di-install lewat migrasi, sehingga query dan RLS bisa rusak diam-diam. Penggantinya:
- setiap migrasi yang membuat fungsi SECURITY DEFINER wajib menulis `REVOKE EXECUTE … FROM PUBLIC, anon` secara eksplisit, lalu `GRANT` ke role yang memang perlu;
- advisor `anon_security_definer_function_executable` dicek setelah setiap deploy (baseline: 22 fungsi yang sengaja terbuka).

### Perbaikan lanjutan 4 Oktober

| Temuan | Perbaikan |
|---|---|
| `dispatch-push` gagal 500 untuk semua notifikasi (1.730×/24 jam) karena secret VAPID tidak terpasang | Dicatat ke log; **pemilik project perlu memasang `VAPID_PUBLIC_KEY` dan `VAPID_PRIVATE_KEY`** |
| `_shared/web-push.ts` tidak pernah bisa mengirim: kunci privat EC diimpor dengan format `raw` (ditolak WebCrypto) dan enkripsi bukan RFC 8291 | Ditulis ulang sesuai RFC 8291/8292; tes mereproduksi vektor RFC 8291 Lampiran A byte-per-byte di Node dan Deno |
| `dispatch-push` tanpa autentikasi (`verify_jwt = false`): siapa pun bisa mengirim notifikasi palsu begitu VAPID aktif | Wajib `X-Internal-Secret` (`app_config.dispatch_push_secret`) atau service role key; `invoke_dispatch_push_instant` mengirim header itu. Migrasi `20261004005225`, function versi 18 |
| Cron `modul-ajar-ai-worker-poll` ditolak 401 setiap 2 menit; antrean tidak dipakai UI sejak 17 Agustus dan RPC-nya hilang | Cron dinonaktifkan (bisa diaktifkan lagi), fungsi dan data tidak dihapus |

---

## Ringkasan

| Fase | Isi | Risiko | Perkiraan | Rollback |
|---|---|---|---|---|
| 0 | Snapshot izin dan definisi fungsi | Tidak ada | 10 menit | — |
| 1 | Cabut akses `anon` dari fungsi yang bukan untuk portal | Rendah | 30 menit | `GRANT` ulang dari snapshot |
| 2 | Tutup fungsi yang hanya boleh dipanggil server | Rendah | 20 menit | `GRANT` ulang |
| 3 | Pensiunkan RPC nilai yang rusak | Rendah | 20 menit | `GRANT` ulang |
| 4 | Kunci `search_path` pada 24 fungsi | Rendah | 20 menit | `ALTER FUNCTION … RESET search_path` |
| 5 | Index untuk 43 foreign key | Sangat rendah | 20 menit | `DROP INDEX` untuk index baru saja |
| 6 | Cegah fungsi baru otomatis terbuka untuk `anon` | Sedang | 15 menit | `ALTER DEFAULT PRIVILEGES … GRANT` |
| 7 | Tindakan manual di dashboard Supabase | — | 15 menit | — |

Fase 1–5 bisa selesai hari ini. Fase 6 sebaiknya dikerjakan setelah fase 1–5 stabil satu hari.

---

## Akar masalah

1. **Default privileges Supabase** memberi `EXECUTE` langsung ke `anon` dan `authenticated` untuk setiap fungsi baru di schema `public` (`pg_default_acl`: `anon=X/postgres`).
   Migrasi `20260717000000_harden_security_definer_functions_and_rls.sql` hanya menjalankan `REVOKE … FROM PUBLIC`, sehingga izin langsung ke `anon` tetap ada. Akibatnya, 55 fungsi SECURITY DEFINER bisa dipanggil tanpa login.
2. **Drift:** isi `bulk_insert_grades` di produksi berbeda dari file migrasi Juli (versi produksi tidak punya cek semester atau cek otorisasi).

---

## Fase 0 — Snapshot (wajib sebelum fase lain)

Simpan hasil query berikut ke `supabase/rollback/2026-10-03_function_acl_snapshot.sql` sebagai bahan rollback:

```sql
select format('GRANT EXECUTE ON FUNCTION %s TO %s;', p.oid::regprocedure, r.rolname)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated')) r(rolname)
where n.nspname = 'public'
  and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
```

Simpan juga definisi lengkap fungsi yang akan diubah di fase 3 dan 4 (`pg_get_functiondef`).

**Gerbang:** file snapshot ada dan tidak kosong.

---

## Fase 1 — Cabut `anon` dari fungsi non-portal

### Tetap terbuka untuk `anon`
Fungsi berikut dipakai Portal Orang Tua, dan semuanya memvalidasi kode akses di dalam fungsinya:
`get_student_portal_data` (beserta `_v1`, `_v2` ×2, `_v3`), `get_student_portal_bintang`, `verify_access_code`,
`send_parent_message`, `update_parent_message`, `delete_parent_message`, `update_parent_info`,
`subscribe_parent`, `unsubscribe_parent`, `get_parent_subscription_status`.

### Juga tetap terbuka (ditunda): fungsi helper RLS
`is_admin_user`, `is_leadership`, `get_user_role`, `has_global_access`, `has_teacher_class_assignment`,
`can_access_student_roster`, `can_access_student_grade_record`, `can_access_student_behavior_record`.

Helper-helper ini dipakai oleh sekitar 40 policy untuk role `public`. Kalau izin `anon` dicabut, query `anon` ke tabel-tabel itu (misalnya cadangan portal di `fetchPortalDataFallback`) akan error `permission denied for function`, bukan sekadar mengembalikan hasil kosong. Fungsi-fungsi ini hanya mengembalikan boolean atau peran, jadi risikonya kecil. Penanganannya dijadwalkan bersama perapian RLS (lihat "Di luar cakupan").

### Dicabut dari `anon`
Dipakai aplikasi, tapi hanya oleh guru yang sudah login (`authenticated` tetap boleh):
`get_student_directory`, `get_active_classes`, `get_class_analytics_attendance`, `activate_semester`,
`auto_fill_weekly_missing_attendance`, `enqueue_modul_ajar_ai_job`, `mark_accessible_communications_read`,
`update_accessible_violation_follow_up`, `upsert_extracurricular_attendance`, `delete_user_account`,
`get_telegram_config`, `set_daily_report_schedule`, `set_app_config`, `get_app_config`, `check_rate_limit`.

Fungsi trigger (pencabutan `EXECUTE` tidak memengaruhi jalannya trigger):
`handle_new_user`, `notify_homeroom_on_violation`, `on_attendance_inserted_or_updated`,
`on_academic_record_inserted`, `on_announcement_inserted`, `capture_soft_delete`, `log_audit_event`.

Contoh SQL:
```sql
REVOKE EXECUTE ON FUNCTION public.get_student_directory() FROM anon, PUBLIC;
-- … satu baris per fungsi; daftar argumen diambil dari pg_get_function_identity_arguments
```

### Gerbang validasi
- Advisor `anon_security_definer_function_executable` hanya menyisakan fungsi portal dan helper RLS.
- Uji asap dengan sesi `anon`: login portal dengan kode akses, tab Bintang tampil, kirim/ubah/hapus pesan orang tua.
- Uji asap dengan sesi guru: Input Massal (memakai `get_student_directory` dan `get_active_classes`), dashboard analitik kelas, aktivasi semester (admin), pengaturan Telegram.
- Panggil `get_student_directory` tanpa login → harus `permission denied`.

**Rollback:** jalankan baris `GRANT … TO anon` yang relevan dari snapshot fase 0.

---

## Fase 2 — Fungsi khusus server: cabut juga dari `authenticated`

Fungsi berikut tidak dipanggil dari kode aplikasi (sudah dicek dengan grep di `src/` dan `supabase/functions/`). Pemanggilnya hanya trigger, cron, atau edge function dengan `service_role`. Dengan izin saat ini, guru mana pun bisa memanggilnya:

| Fungsi | Risiko kalau dibiarkan |
|---|---|
| `invoke_dispatch_push_instant` | Notifikasi push berisi teks apa pun ke orang tua siswa mana pun |
| `set_modul_ajar_worker_config` | Alamat worker AI dan service key dialihkan |
| `sync_users_to_roles` | Peran yang sudah dicabut admin muncul lagi sebagai `teacher` (migrasi Juli memang hanya mengizinkan `service_role`) |
| `invoke_scheduled_backup`, `reschedule_daily_report` | Backup dan jadwal laporan bisa dipicu sembarang orang |
| `get_backup_runs` | Riwayat backup terbaca |
| `debug_student_verification` | Fungsi debug terbuka |
| `cleanup_daily_input_logs` | Log dihapus di luar jadwal |

```sql
REVOKE EXECUTE ON FUNCTION public.invoke_dispatch_push_instant(uuid, text, jsonb) FROM anon, authenticated, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.invoke_dispatch_push_instant(uuid, text, jsonb) TO service_role;
-- … dan seterusnya
```

**Pra-cek:** pastikan trigger pemanggil `invoke_dispatch_push_instant` adalah SECURITY DEFINER milik `postgres`, sehingga tetap punya izin lewat pemiliknya. Pastikan juga job `pg_cron` berjalan sebagai `postgres`.

**Gerbang:**
- Catat pelanggaran baru → notifikasi push ke wali kelas tetap terkirim.
- Isi absensi → trigger tetap jalan.
- Cron backup berikutnya tercatat di `backup_runs`.

**Rollback:** `GRANT` ulang dari snapshot.

---

## Fase 3 — Pensiunkan RPC nilai yang rusak (tanpa menghapus fungsi)

Temuan di produksi:
- `bulk_insert_grades` menulis ke kolom `teacher_id` dan `updated_at`, dan memakai `ON CONFLICT (student_id, subject, assessment_name)`. Kolom dan constraint itu **tidak ada** di `academic_records`, sehingga fungsi selalu gagal.
- `update_grade_with_version` menulis `updated_at` yang tidak ada, sehingga juga selalu gagal. Sebagai bukti, 0 dari 2.460 baris punya `version > 1`.
- `apply_quiz_points_to_grade` menerima `user_id_param` dari pemanggil, sehingga pemeriksaan kepemilikannya bisa dipalsukan. Fungsi ini juga **menghapus permanen** `quiz_points`. Tidak ada pemanggil di aplikasi.
- Hook `src/hooks/useGradeManagement.ts`, satu-satunya pemakai dua RPC pertama, tidak dipakai di mana pun.

Tindakan: cabut `EXECUTE` dari `anon`, `authenticated`, dan `PUBLIC` untuk ketiganya. Fungsinya **tidak dihapus**.
Kode klien yang mati (`useGradeManagement`, `bulkInsertGrades`, `updateGradeWithVersion`) dicatat sebagai utang teknis dan dibahas terpisah.

**Alternatif (tidak disarankan hari ini):** memperbaiki kedua fungsi (kolom yang benar, unique index, dan cek `can_access_student_grade_record(auth.uid(), …)`). Ini menambah fitur baru, bukan menambal celah, dan unique index baru bisa gagal kalau ada data ganda.

**Gerbang:** input nilai lewat halaman yang sekarang dipakai guru (insert langsung ke tabel lewat RLS) tetap berhasil.

**Rollback:** `GRANT` ulang dari snapshot.

---

## Fase 4 — Kunci `search_path` pada 24 fungsi

Daftar dari advisor `function_search_path_mutable`:
`get_user_role, sync_users_to_roles, get_semester_id_for_date, set_attendance_semester_id, set_academic_record_semester_id, set_quiz_point_semester_id, activate_semester, upsert_extracurricular_attendance, can_access_student_roster, set_teacher_class_assignments_updated_at, handle_updated_at, update_parent_info, set_modul_ajar_worker_config, capture_soft_delete, get_backup_runs, invoke_scheduled_backup, invoke_dispatch_push_instant, on_academic_record_inserted, on_attendance_inserted_or_updated, on_announcement_inserted, can_access_student_grade_record, has_global_access, notify_homeroom_on_violation, set_ph_schedules_updated_at`

```sql
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public, pg_temp;
-- … satu baris per fungsi
```

**Pra-cek (sudah dijalankan):**
- Tidak ada fungsi yang memanggil fungsi ekstensi tanpa nama schema (`uuid_generate_v4`, `crypt`, `digest`, dan sejenisnya).
- `net.http_post` sudah ditulis dengan nama schema.
- Tidak ada yang punya `proconfig`.

**Gerbang:**
- Advisor `function_search_path_mutable` = 0.
- Uji trigger: insert absensi, nilai, poin keaktifan → `semester_id` terisi otomatis.
- Update `teacher_class_assignments` → `updated_at` berubah.

**Rollback:** `ALTER FUNCTION … RESET search_path;`

---

## Fase 5 — Index untuk 43 foreign key

Tabel terbesar adalah `attendance` dengan sekitar 31 ribu baris, jadi `CREATE INDEX` biasa (tanpa `CONCURRENTLY`, yang tidak bisa berjalan di dalam transaksi migrasi) hanya mengunci tabel dalam hitungan milidetik.

Penamaan: `idx_<tabel>_<kolom>`, dengan `CREATE INDEX IF NOT EXISTS` supaya idempoten. Daftar kolom diambil dari `fkey_columns` di hasil advisor, lalu diubah ke nama kolom lewat `pg_attribute` saat menulis migrasi.

Prioritas (paling sering dipakai join dan RLS):
`quiz_points.student_id`, `communications.student_id`, `students.class_id`, `attendance.semester_id`,
`attendance.teacher_id`, `violations.semester_id`, `violations.user_id`, `academic_records.semester_id`,
`tasks.class_id`, `homework.class_id`, `student_development_analyses.student_id`.

**Gerbang:**
- Advisor `unindexed_foreign_keys` = 0.
- Jumlah baris di semua tabel sama sebelum dan sesudah.

**Rollback:** `DROP INDEX IF EXISTS` **hanya** untuk index yang dibuat di fase ini. Tidak menyentuh data.

---

## Fase 6 — Cegah fungsi baru otomatis terbuka (dikerjakan belakangan)

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
```

Akibatnya, setiap RPC portal baru wajib menulis `GRANT EXECUTE … TO anon` secara eksplisit, seperti `get_student_portal_bintang`. Aturan ini perlu ditambahkan ke panduan migrasi di `references/project-guide.md` (skill portal-guru) sebelum diterapkan, agar tidak membingungkan pembuat migrasi berikutnya.

**Rollback:** `ALTER DEFAULT PRIVILEGES … GRANT EXECUTE ON FUNCTIONS TO anon;`

---

## Fase 7 — Tindakan manual di dashboard Supabase (oleh pemilik project)

1. Authentication → Policies → aktifkan **Leaked password protection**.
2. Settings → Infrastructure → upgrade Postgres (`17.4.1.054` punya patch keamanan). Jadwalkan di luar jam sekolah karena ada downtime singkat.

---

## Prosedur eksekusi

1. Fase 0: snapshot → simpan file rollback.
2. Satu file migrasi per fase (`apply_migration` lewat MCP), lalu ganti nama file lokal sesuai versi di `schema_migrations` supaya `supabase db push` di CI tidak bentrok.
3. Setelah setiap fase: jalankan ulang advisor, uji asap sesuai gerbang, dan cek jumlah baris tabel utama (`students`, `attendance`, `academic_records`, `violations`, `quiz_points`, `bintang_monthly_evaluations`).
4. Kalau ada gerbang yang gagal: jalankan rollback fase itu dan berhenti. Jangan lanjut ke fase berikutnya.
5. Setelah selesai: `npm test`, perbarui CHANGELOG, dan tambahkan catatan aturan grant di panduan migrasi.

## Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Fitur portal putus karena fungsi yang dibutuhkan ikut dicabut | Rendah | Tinggi | Daftar portal diambil dari grep pemanggil `rpc(` di kode portal; uji asap portal di gerbang fase 1 |
| Query `anon` error karena helper RLS dicabut | — | Tinggi | Helper RLS sengaja dikeluarkan dari fase 1 |
| Trigger atau cron berhenti setelah fase 2 | Rendah | Sedang | Pra-cek pemilik fungsi; uji push dan backup di gerbang |
| Fungsi gagal setelah `search_path` dikunci | Rendah | Sedang | Pra-cek fungsi ekstensi tanpa schema sudah dijalankan (0 temuan) |
| Drift file migrasi lokal vs remote | Sedang | Rendah | Ganti nama file sesuai versi remote setelah apply |

## Di luar cakupan (sesi terpisah)

- 189 policy dengan `auth.uid()` yang dievaluasi per baris (`auth_rls_initplan`) dan 200 kasus policy permissive ganda. Ini juga tempat yang tepat untuk menangani akses `anon` ke helper RLS.
- Index ganda `attendance_student_date_unique` / `attendance_student_id_date_key`, 34 index yang tidak terpakai, dan tabel `_backup_violation_type_20261003`. Ketiganya berarti menghapus objek, jadi perlu persetujuan eksplisit.
- Ekstensi `pg_net` yang terpasang di schema `public`.

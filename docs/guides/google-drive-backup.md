# Backup Otomatis ke Google Drive

Workflow `.github/workflows/backup-to-google-drive.yml` membuat backup database Supabase setiap hari pukul 02:00 WIB dan mengunggahnya ke Google Drive.

## Secret GitHub yang Dibutuhkan

Tambahkan secret berikut di GitHub:

`Settings > Secrets and variables > Actions > New repository secret`

1. `SUPABASE_DB_URL`

   Isi dengan connection string database Supabase format URI, contoh:

   ```text
   postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
   ```

   Jangan gunakan Project URL Supabase seperti `https://PROJECT_REF.supabase.co`.

2. `GDRIVE_SERVICE_ACCOUNT_JSON`

   Isi dengan seluruh isi file JSON service account dari Google Cloud.

3. `GDRIVE_FOLDER_ID`

   Isi dengan ID folder Google Drive tujuan backup.

## Setup Google Drive

1. Buka Google Cloud Console.
2. Buat project baru untuk backup.
3. Aktifkan Google Drive API.
4. Buat service account.
5. Buat key JSON untuk service account.
6. Buat folder di Google Drive, misalnya `Backup Guru Cerdas`.
7. Share folder tersebut ke email service account dengan akses `Editor`.
8. Copy folder ID dari URL folder Google Drive.

## Cara Menjalankan Manual

1. Buka tab `Actions` di GitHub.
2. Pilih workflow `Backup Supabase to Google Drive`.
3. Klik `Run workflow`.
4. Pastikan file `.dump` dan `.sha256` muncul di folder Google Drive.

## Retensi Backup

Workflow menyimpan backup Google Drive selama 90 hari untuk file dengan prefix:

```text
guru-cerdas-db-*.dump
guru-cerdas-db-*.dump.sha256
```

File lain di folder Google Drive tidak dihapus oleh workflow.

## Restore Backup

Untuk restore ke database PostgreSQL baru:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" guru-cerdas-db-YYYY-MM-DD_HH-MM-SS_WIB.dump
```

Selalu tes restore ke database cadangan terlebih dahulu, bukan langsung ke database produksi.

## Catatan

Jika GitHub Actions gagal connect ke database Supabase karena koneksi IPv6/direct connection, gunakan connection string Supabase pooler mode `session` yang tersedia di Supabase Dashboard.

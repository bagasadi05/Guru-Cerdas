# ⚠️ REQUIRED DATABASE UPDATE

**Tindakan Diperlukan:** Aplikasi Anda mengalami error `400 Bad Request` saat memproses tugas/tasks karena database Supabase belum memiliki kolom yang diperlukan untuk fitur Soft Delete.

Silakan jalankan script SQL berikut di [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) untuk memperbaikinya.

## SQL Script

```sql
-- Tambahkan kolom deleted_at ke tabel tasks jika belum ada
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Tambahkan index untuk performa query
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Komentar dokumentasi
COMMENT ON COLUMN tasks.deleted_at IS 'Timestamp when record was soft deleted, NULL if active';

-- Verifikasi tabel lain juga (untuk memastikan konsistensi)
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON classes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_attendance_deleted_at ON attendance(deleted_at);
```

## Cara Menjalankan

1. Copy kode SQL di atas.
2. Buka Dashboard Supabase project Anda.
3. Klik menu **SQL Editor** di sidebar kiri.
4. Klik **New Query**.
5. Paste kode SQL.
6. Klik **Run**.
7. Kembali ke aplikasi dan coba operasi delete/update lagi.

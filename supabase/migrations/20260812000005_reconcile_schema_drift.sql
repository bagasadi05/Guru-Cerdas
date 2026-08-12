-- 20260812000005_reconcile_schema_drift.sql
--
-- Menyelaraskan migration dengan schema nyata di database:
-- kolom berikut DIPAKAI aplikasi/trigger/security-definer tapi tidak pernah
-- ditambahkan lewat migration (dibuat langsung di dashboard/SQL editor).
-- Tanpa migration ini, database yang dibangun fresh dari migration saja
-- akan kekurangan kolom dan aplikasi akan error (query 400 via PostgREST,
-- is_admin_user()/trigger gagal).
--
-- Idempotent — `IF NOT EXISTS` membuatnya no-op di DB yang kolomnya sudah ada.

-- user_roles.deleted_at — dipakai is_admin_user(), trigger sinkronisasi
-- notifikasi, dan berbagai RLS. Tanpa ini fresh-DB tidak bisa login admin.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- action_history.description — ditulis UndoManager (recordAction) untuk
-- label aksi yang bisa dibatalkan.
ALTER TABLE public.action_history
  ADD COLUMN IF NOT EXISTS description text;

-- extracurriculars.updated_at — kolom timestamp update (types: non-null).
ALTER TABLE public.extracurriculars
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- extracurricular_students.updated_at — kolom timestamp update (types: non-null).
ALTER TABLE public.extracurricular_students
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

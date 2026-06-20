-- ============================================
-- Migration: Storage policies for achievement_certificates folder in student_assets bucket
-- Created: 2026-06-20
-- Description: Sets up safe insert, select, update, and delete storage policies for
--              achievement_certificates prefix/folder in the student_assets bucket.
-- ============================================

-- Drop existing policies if they exist to prevent errors on rerun
drop policy if exists "achievement_certificates_insert" on storage.objects;
create policy "achievement_certificates_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student_assets'
  and (storage.foldername(name))[1] = 'achievement_certificates'
);

drop policy if exists "achievement_certificates_select" on storage.objects;
create policy "achievement_certificates_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'student_assets'
  and (storage.foldername(name))[1] = 'achievement_certificates'
);

drop policy if exists "achievement_certificates_update" on storage.objects;
create policy "achievement_certificates_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'student_assets'
  and (storage.foldername(name))[1] = 'achievement_certificates'
)
with check (
  bucket_id = 'student_assets'
  and (storage.foldername(name))[1] = 'achievement_certificates'
);

drop policy if exists "achievement_certificates_delete" on storage.objects;
create policy "achievement_certificates_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'student_assets'
  and (storage.foldername(name))[1] = 'achievement_certificates'
);

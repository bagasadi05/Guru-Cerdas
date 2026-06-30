-- ============================================================
-- Storage Cleanup — Guru Cerdas
-- Jalanin ONCE via Supabase SQL Editor atau `supabase db execute`
-- ============================================================

-- 1. Hapus avatar external dummy (gravatar/dicebear) yang gak dipake
UPDATE students
SET avatar_url = NULL
WHERE (avatar_url LIKE '%pravatar%' OR avatar_url LIKE '%dicebear%')
  AND deleted_at IS NULL;

-- 2. Cek evidence orphan (violation soft-delete tapi file masih di storage)
SELECT id, evidence_url, deleted_at
FROM violations
WHERE evidence_url IS NOT NULL AND evidence_url != ''
  AND deleted_at IS NOT NULL;

-- 3. Cek certificate orphan (achievement soft-delete tp file masih di storage)
SELECT id, certificate_url
FROM student_achievements
WHERE certificate_url IS NOT NULL AND certificate_url != ''
  AND deleted_at IS NOT NULL;

-- 4. Hitung total storage yg bisa di-free (estimasi)
SELECT 'violations_orphan' AS source, count(*) AS records, 'check evidence_url' AS note
FROM violations WHERE evidence_url IS NOT NULL AND deleted_at IS NOT NULL
UNION ALL
SELECT 'certificates_orphan', count(*), 'check certificate_url'
FROM student_achievements WHERE certificate_url IS NOT NULL AND deleted_at IS NOT NULL
UNION ALL
SELECT 'external_avatars', count(*), 'nullified'
FROM students WHERE (avatar_url LIKE '%pravatar%' OR avatar_url LIKE '%dicebear%');

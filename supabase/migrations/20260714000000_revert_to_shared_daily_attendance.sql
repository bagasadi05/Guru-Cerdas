-- Migration: Revert to single shared daily attendance record
-- Tujuan: Membuat absensi harian menjadi satu catatan (shared) antar guru
-- yang mengajar di kelas yang sama, bukan terpisah per guru.

-- 1. Deduplicate attendance table
-- Menyimpan record yang paling baru di-update, menghapus duplikat untuk (student_id, date) yang sama
WITH ranked_attendance AS (
    SELECT 
        id,
        ROW_NUMBER() OVER(PARTITION BY student_id, date ORDER BY created_at DESC NULLS LAST) as rn
    FROM public.attendance
)
DELETE FROM public.attendance
WHERE id IN (
    SELECT id 
    FROM ranked_attendance 
    WHERE rn > 1
);

-- 2. Drop the teacher-specific index
DROP INDEX IF EXISTS public.attendance_teacher_daily_idx;

-- 3. Add the unique constraint back (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'attendance_student_id_date_key'
    ) THEN
        ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;

-- 4. Update RLS: Hapus policy "own accessible" menjadi "accessible" 
-- (agar bisa diupdate/delete oleh guru lain yang memiliki akses ke kelas/siswa tersebut)
DROP POLICY IF EXISTS "Teachers can update own accessible attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can delete own accessible attendance" ON public.attendance;

CREATE POLICY "Teachers can update accessible attendance"
    ON public.attendance
    FOR UPDATE
    USING (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    )
    WITH CHECK (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

CREATE POLICY "Teachers can delete accessible attendance"
    ON public.attendance
    FOR DELETE
    USING (
        public.can_access_student_behavior_record(auth.uid(), student_id, semester_id)
    );

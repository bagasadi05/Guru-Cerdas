-- Migration: Normalisasi nama mata pelajaran lintas tabel
--
-- MASALAH
-- Nama mapel disimpan sebagai teks bebas di 7 kolom operasional tanpa daftar
-- acuan, sehingga tumbuh puluhan varian: "BAHASA INDONESIA", "B INDO",
-- "Bhs Indonesia", "MATE", "SB", "BARAB", dst. Query nilai memakai
-- .eq('subject', ...) yang case-sensitive, jadi nilai yang tersimpan di bawah
-- varian berbeda tidak terbaca guru dan tidak ikut terhitung di laporan.
-- Contoh nyata: 30 nilai "BAHASA INDONESIA" (22 Jul 2026) tidak terlihat oleh
-- guru yang membuka mapel "Bahasa Indonesia".
--
-- KEPUTUSAN PENAMAAN (dikonfirmasi pemilik produk, 26 Jul 2026)
--   * "Informatika" menggantikan "TIK"
--   * "Akidah Akhlak" menggantikan "Akidah"
--   * "Pendidikan Karakter" menjadi mapel resmi baru
--   * "PPKn" -> "Pancasila"
--   * "ASS TIK" / "AS PJOK" / "ASS PJOK" adalah peran asisten mapel, bukan nama
--     mapel. Dipetakan ke mapel induk; keterangan asisten dipindah ke kolom
--     notes agar informasinya tidak hilang.
--
-- DEDUPLIKASI
-- Penggabungan TIK -> Informatika membuat 88 siswa punya dua baris untuk ujian
-- SAT yang sama (guru menginput SAT dua kali di hari yang sama, 87 dari 88
-- skornya identik). Ditambah 147 baris redundan yang sudah ada sebelumnya,
-- totalnya harus dibereskan atau tabel makin kotor. Kebijakan yang dipilih:
-- pertahankan entri TERBARU, sisanya soft-delete. Kebijakan ini identik dengan
-- perilaku dedupeAcademicRecords() di frontend, jadi tidak ada nilai yang
-- berubah dari yang selama ini tampil di layar.
--
-- TIDAK DISENTUH
-- Tabel referensi Modul Ajar (ref_capaian_pembelajaran, ref_boilerplate_topik)
-- sengaja dibiarkan. Keduanya milik domain lain, dicocokkan case-insensitive
-- via ilike() di modulAjarContentService, dan memakai konvensi penamaan
-- kurikulum sendiri ("Al-Quran Hadis", "Pendidikan Pancasila"). Menyamakannya
-- perlu keputusan terpisah -- lihat CATATAN TINDAK LANJUT di akhir file.

-- ---------------------------------------------------------------------------
-- 0. Rapikan spasi berlebih lebih dulu supaya pemetaan di bawah kena semua
--    (mis. "Fiqih " dengan spasi di belakang).
-- ---------------------------------------------------------------------------
UPDATE public.academic_records         SET subject          = btrim(subject)          WHERE subject          <> btrim(subject);
UPDATE public.quiz_points              SET subject          = btrim(subject)          WHERE subject          <> btrim(subject);
UPDATE public.quiz_points              SET used_for_subject = btrim(used_for_subject) WHERE used_for_subject <> btrim(used_for_subject);
UPDATE public.teacher_class_assignments SET subject_name    = btrim(subject_name)     WHERE subject_name     <> btrim(subject_name);
UPDATE public.schedules                SET subject          = btrim(subject)          WHERE subject          <> btrim(subject);
UPDATE public.teaching_journals        SET subject          = btrim(subject)          WHERE subject          <> btrim(subject);
UPDATE public.homework                 SET subject          = btrim(subject)          WHERE subject          <> btrim(subject);

-- ---------------------------------------------------------------------------
-- 1. Simpan keterangan "asisten mapel" SEBELUM nama mapelnya ditimpa.
-- ---------------------------------------------------------------------------
UPDATE public.teacher_class_assignments
SET notes = CASE
        WHEN COALESCE(btrim(notes), '') = '' THEN 'Asisten mapel'
        ELSE btrim(notes) || ' | Asisten mapel'
    END
WHERE deleted_at IS NULL
  AND subject_name IN ('ASS TIK', 'AS PJOK', 'ASS PJOK');

-- ---------------------------------------------------------------------------
-- 2. Tabel pemetaan alias -> nama kanonik.
--    Dibuat permanen (bukan TEMP) supaya bisa dipakai ulang oleh trigger/
--    validasi di masa depan, dan supaya isinya bisa diaudit.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_subject_alias (
    alias      text PRIMARY KEY,
    canonical  text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ref_subject_alias IS
    'Pemetaan varian penulisan nama mapel ke nama kanonik. Sumber kebenaran '
    'nama kanonik ada di src/constants/subjects.ts (SUBJECTS).';

INSERT INTO public.ref_subject_alias (alias, canonical) VALUES
    ('BAHASA INDONESIA',   'Bahasa Indonesia'),
    ('B INDO',             'Bahasa Indonesia'),
    ('Bhs Indonesia',      'Bahasa Indonesia'),
    ('BHS INDONESIA',      'Bahasa Indonesia'),
    ('MATEMATIKA',         'Matematika'),
    ('MATE',               'Matematika'),
    ('matematika',         'Matematika'),
    ('PANCASILA',          'Pancasila'),
    ('PEND PANCASILA',     'Pancasila'),
    ('PPKn',               'Pancasila'),
    ('PPKN',               'Pancasila'),
    ('BAHASA INGGRIS',     'Bahasa Inggris'),
    ('B INGGRIS',          'Bahasa Inggris'),
    ('BAHASA ARAB',        'Bahasa Arab'),
    ('B ARAB',             'Bahasa Arab'),
    ('BARAB',              'Bahasa Arab'),
    ('BAHASA JAWA',        'Bahasa Jawa'),
    ('B JAWA',             'Bahasa Jawa'),
    ('SENI BUDAYA',        'Seni Budaya'),
    ('SB',                 'Seni Budaya'),
    ('AKIDAH',             'Akidah Akhlak'),
    ('Akidah',             'Akidah Akhlak'),
    ('AKIDAH AKHLAK',      'Akidah Akhlak'),
    ('QUR''AN HADITS',     'Qur''an Hadits'),
    ('QURDIST',            'Qur''an Hadits'),
    ('Qurdist 1A',         'Qur''an Hadits'),
    ('QURDIST 1A',         'Qur''an Hadits'),
    ('FIKIH',              'Fikih'),
    ('FIQIH',              'Fikih'),
    ('Fiqih',              'Fikih'),
    ('TIK',                'Informatika'),
    ('ASS TIK',            'Informatika'),
    ('AS PJOK',            'PJOK'),
    ('ASS PJOK',           'PJOK'),
    ('PENDIDIKAN KARAKTER', 'Pendidikan Karakter'),
    ('Pend. Karakter',     'Pendidikan Karakter')
ON CONFLICT (alias) DO UPDATE SET canonical = EXCLUDED.canonical;

-- ---------------------------------------------------------------------------
-- 3. Terapkan pemetaan ke seluruh kolom operasional.
-- ---------------------------------------------------------------------------
UPDATE public.academic_records ar
SET subject = a.canonical
FROM public.ref_subject_alias a
WHERE ar.subject = a.alias AND ar.subject <> a.canonical;

UPDATE public.quiz_points qp
SET subject = a.canonical
FROM public.ref_subject_alias a
WHERE qp.subject = a.alias AND qp.subject <> a.canonical;

UPDATE public.quiz_points qp
SET used_for_subject = a.canonical
FROM public.ref_subject_alias a
WHERE qp.used_for_subject = a.alias AND qp.used_for_subject <> a.canonical;

UPDATE public.teacher_class_assignments tca
SET subject_name = a.canonical
FROM public.ref_subject_alias a
WHERE tca.subject_name = a.alias AND tca.subject_name <> a.canonical;

UPDATE public.schedules s
SET subject = a.canonical
FROM public.ref_subject_alias a
WHERE s.subject = a.alias AND s.subject <> a.canonical;

UPDATE public.teaching_journals tj
SET subject = a.canonical
FROM public.ref_subject_alias a
WHERE tj.subject = a.alias AND tj.subject <> a.canonical;

UPDATE public.homework h
SET subject = a.canonical
FROM public.ref_subject_alias a
WHERE h.subject = a.alias AND h.subject <> a.canonical;

-- ---------------------------------------------------------------------------
-- 4. Soft-delete baris nilai yang kembar setelah normalisasi.
--    Kunci logis: (student_id, subject, assessment_name, semester_id).
--    Yang dipertahankan: created_at terbaru, lalu version tertinggi.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY student_id,
                            subject,
                            COALESCE(assessment_name, ''),
                            COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
               ORDER BY created_at DESC, COALESCE(version, 0) DESC, id DESC
           ) AS rn
    FROM public.academic_records
    WHERE deleted_at IS NULL
)
UPDATE public.academic_records ar
SET deleted_at = now()
FROM ranked r
WHERE ar.id = r.id AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- CATATAN TINDAK LANJUT (belum dikerjakan di migrasi ini)
--
-- a) Unique index anti-duplikat:
--        CREATE UNIQUE INDEX CONCURRENTLY academic_records_logical_key
--        ON public.academic_records (student_id, subject, assessment_name, semester_id)
--        WHERE deleted_at IS NULL;
--    SENGAJA DITUNDA. Frontend saat ini memanggil .upsert(records) yang hanya
--    konflik di primary key id. Begitu unique index dipasang, upsert tersebut
--    akan melempar error 23505 dan guru tidak bisa menyimpan nilai sama sekali.
--    Pasang index ini HANYA setelah kode diubah ke
--    .upsert(records, { onConflict: 'student_id,subject,assessment_name,semester_id' })
--    dan versi barunya sudah ter-deploy ke semua pengguna.
--
-- b) Tabel referensi Modul Ajar masih memakai konvensi penamaan berbeda
--    ("Al-Quran Hadis" vs "Qur'an Hadits", "Pendidikan Pancasila" vs
--    "Pancasila", dan masih ada "TIK"). Perlu keputusan terpisah apakah
--    disamakan atau dibiarkan, karena pencocokannya sudah case-insensitive
--    dan menyentuhnya berisiko memutus lookup capaian pembelajaran.
-- ---------------------------------------------------------------------------

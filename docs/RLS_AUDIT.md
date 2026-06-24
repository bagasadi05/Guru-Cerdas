# Row Level Security (RLS) Audit — Skenario Multi-User (50 Guru)

Audit ini mengevaluasi Row Level Security (RLS) di database Supabase untuk memastikan isolasi data yang aman dan kolaborasi yang tepat ketika **50 guru berbagi satu workspace (database)**.

Setiap guru harus dapat mengakses data milik siswa di kelas yang diajarkan/diwalikan (melalui tabel `teacher_class_assignments`), namun tidak boleh membaca atau memodifikasi data kelas/siswa dari guru lain yang tidak ditugaskan kepada mereka.

---

## 1. Ringkasan Status RLS per Tabel

| Nama Tabel | Status Keamanan | RLS Policy Saat Ini | Analisis & Dampak Multi-User | Rekomendasi Tindakan |
|------------|-----------------|---------------------|-------------------------------|----------------------|
| `classes` | ✅ AMAN | `can_access_student_roster` | Mengizinkan akses hanya ke Admin, pemilik kelas, atau guru yang ditugaskan ke kelas tersebut. | Tidak perlu perubahan. |
| `students` | ✅ AMAN | `can_access_student_roster` | Hanya guru yang ditugaskan ke kelas siswa tersebut yang dapat melihat profil siswa. | Tidak perlu perubahan. |
| `academic_records` | ✅ AMAN | `can_access_student_grade_record` | Hanya guru pengampu mapel, wali kelas, atau Admin yang dapat melihat/memperbarui nilai siswa. | Tidak perlu perubahan. |
| `quiz_points` | ✅ AMAN | `can_access_student_grade_record` | Mengikuti aturan akses nilai yang aman. | Tidak perlu perubahan. |
| `attendance` | ✅ AMAN | `can_access_student_behavior_record` | Hanya wali kelas, pemilik siswa, atau Admin yang dapat mengelola presensi harian siswa. | Tidak perlu perubahan. |
| `violations` | ✅ AMAN | `can_access_student_behavior_record` | Hanya wali kelas atau Admin yang dapat melihat dan memperbarui poin pelanggaran siswa. | Tidak perlu perubahan. |
| `reports` | ✅ AMAN | `can_access_student_behavior_record` | Hanya wali kelas atau Admin yang dapat melihat laporan perkembangan rapor. | Tidak perlu perubahan. |
| `communications` | ✅ AMAN | `can_access_student_roster` | Memastikan percakapan dengan orang tua siswa hanya dapat diakses oleh guru kelas yang bersangkutan. | Tidak perlu perubahan. |
| `student_achievements` | ⚠️ CELAH VISIBILITAS | `auth.uid() = user_id` | **Hanya guru pembuat prestasi** yang dapat melihat prestasi siswa. Wali kelas tidak bisa melihat daftar prestasi siswa tersebut untuk dicetak di Rapor. | Perluas policy `SELECT` menggunakan `can_access_student_roster` pada `student_id`. |
| `student_development_analyses` | ⚠️ CELAH VISIBILITAS | `auth.uid() = user_id` | Wali kelas tidak dapat melihat analisis perkembangan AI milik siswanya jika dianalisis oleh guru BK/guru lain. | Perluas policy `SELECT` menggunakan `can_access_student_roster` pada `student_id`. |
| `teaching_journals` | ⚠️ CELAH VISIBILITAS | `auth.uid() = user_id` | Wali kelas atau Admin tidak bisa memantau agenda mengajar/jurnal KBM yang diinput oleh guru mata pelajaran lain di kelasnya. | Perluas policy `SELECT` menggunakan `can_access_student_roster` pada `class_id`. |
| `student_extracurriculars` | ⚠️ CELAH VISIBILITAS | `auth.uid() = user_id` | Wali kelas tidak bisa membaca partisipasi ekstrakurikuler siswanya untuk keperluan rapor. | Perluas policy `SELECT` menggunakan `can_access_student_roster` pada `student_id`. |
| `extracurricular_grades` | ⚠️ CELAH VISIBILITAS | `auth.uid() = user_id` | Wali kelas tidak bisa melihat nilai ekstrakurikuler siswanya untuk dimasukkan ke Rapor. | Perluas policy `SELECT` menggunakan `can_access_student_roster` pada `student_id`. |
| `academic_years` | ✅ AMAN | `auth.uid() = user_id` | Data konfigurasi tahun ajaran diisolasi per guru/sekolah. | Tidak perlu perubahan. |
| `semesters` | ✅ AMAN | `auth.uid() = user_id` | Data konfigurasi semester diisolasi per guru/sekolah. | Tidak perlu perubahan. |
| `action_history` | ✅ AMAN | `auth.uid() = user_id` | Riwayat undo/redo hanya dapat dilihat oleh guru yang melakukan aksi tersebut. | Tidak perlu perubahan. |
| `tasks` | ✅ AMAN | `auth.uid() = user_id` | To-do list pribadi guru, hanya dapat diakses oleh guru bersangkutan. | Tidak perlu perubahan. |

---

## 2. Rincian Temuan & Rekomendasi Perbaikan

### A. Prestasi Siswa (`student_achievements`)
* **Masalah**: Policy saat ini menggunakan `USING (auth.uid() = user_id)`. Hal ini mencegah guru pengampu kelas/wali kelas melihat portofolio prestasi siswanya sendiri jika prestasi tersebut dimasukkan oleh guru lain (misal: guru pembina OSIS atau guru olahraga).
* **Solusi**: Tambahkan RLS Policy untuk memperbolehkan `SELECT` jika guru tersebut memiliki akses roster kelas siswa tersebut:
  ```sql
  EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_achievements.student_id
        AND public.can_access_student_roster(auth.uid(), s.class_id)
  )
  ```
  Akses untuk modifikasi data (`INSERT`, `UPDATE`, `DELETE`) tetap dibatasi hanya kepada pemilik data (`auth.uid() = user_id`) atau Admin demi integritas data.

### B. Analisis Perkembangan AI (`student_development_analyses`)
* **Masalah**: Wali kelas memerlukan visibilitas atas hasil analisis perkembangan siswanya guna memberikan bimbingan yang tepat, meskipun analisis tersebut diinisiasi oleh guru bimbingan konseling (BK) atau sistem.
* **Solusi**: Perluas akses `SELECT` bagi guru yang memiliki akses kelas siswa bersangkutan:
  ```sql
  EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_development_analyses.student_id
        AND public.can_access_student_roster(auth.uid(), s.class_id)
  )
  ```

### C. Jurnal Mengajar KBM (`teaching_journals`)
* **Masalah**: Agenda KBM/Jurnal mengajar saat ini bersifat privat. Padahal, wali kelas dan kepala sekolah (Admin) wajib memantau keterlaksanaan kurikulum dan KBM dari seluruh guru mapel yang masuk di kelas asuhannya.
* **Solusi**: Perluas akses `SELECT` jurnal mengajar agar dapat dibaca oleh wali kelas atau guru lain yang ditugaskan di kelas tersebut:
  ```sql
  public.can_access_student_roster(auth.uid(), class_id)
  ```

### D. Ekstrakurikuler (`student_extracurriculars` & `extracurricular_grades`)
* **Masalah**: Guru wali kelas harus mencetak nilai ekskul di Rapor, tetapi terhalang RLS karena data hanya dapat diakses oleh pembina ekskul (`user_id = auth.uid()`).
* **Solusi**: Tambahkan policy `SELECT` agar wali kelas siswa bersangkutan dapat melihat data keanggotaan dan nilai ekskul:
  ```sql
  EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND public.can_access_student_roster(auth.uid(), s.class_id)
  )
  ```

---

## 3. Langkah Keamanan Tambahan (Hardening)

Seluruh perubahan RLS di atas akan dibungkus ke dalam satu berkas migrasi SQL idempotent baru:
`supabase/migrations/20260624180000_harden_multi_user_rls.sql`

Migrasi ini akan menghapus policy select lama yang terlalu ketat secara selektif dan menggantikannya dengan policy kolaboratif berbasis hak akses roster kelas siswa, tanpa melonggarkan hak akses tulis (INSERT/UPDATE/DELETE).

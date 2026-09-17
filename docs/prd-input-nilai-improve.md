# PRD: Peningkatan Menu Input Nilai (Input Penilaian)

> **Status:** Fase 1–2 sudah diimplementasikan (2026-09-17); Fase 3–4 masih menunggu  
> **Tanggal:** 2026-09-17  
> **Penanggung Jawab:** Tim Pengembangan Guru Cerdas  
> **Sprint Target:** Q4 2026  
> **Dokumen Terkait:** `docs/prd-analisis-akademik-improve.md`, `docs/prd-dashboard-improve.md`, `docs/GRADE_IMPORT_TROUBLESHOOTING.md`, `docs/STABILIZATION_SPRINT10.md`, `docs/DESIGN_STANDARDS.md`

---

## 1. Latar Belakang & Masalah

Menu **Input Penilaian** (`/input-massal`, label sidebar "Input Penilaian") adalah pintu masuk harian guru untuk menulis nilai. Halaman ini adalah layar kerja paling sering dipakai, tetapi juga yang paling kompleks: satu halaman melayani 7 mode (`subject_grade`, `quiz`, `attitude`, `violation`, `violation_export`, `bulk_report`, `academic_print`) dengan alur 2 langkah (pilih mode → isi data).

Hasil review kode 2026-09-17 menemukan beberapa masalah yang masih terbuka:

| # | Masalah | Bukti di Kode | Dampak |
|---|---------|---------------|--------|
| 1 | Tombol **✕ "Batalkan pilihan"** (floating save bar) dan **"Bersihkan"** (footer) langsung menghapus seluruh nilai yang sudah diketik, tanpa konfirmasi dan tanpa undo | `MassInputPageView.tsx` (`setScores({})` / `setSelectedStudentIds(new Set())`), `Step2_Footer.tsx` | Guru bisa kehilangan 30+ nilai yang diketik dalam sekali klik salah |
| 2 | **KKM punya dua sumber yang tidak sinkron**: KKM di panel Input Nilai hanya berlaku satu sesi (state lokal), sedangkan KKM guru tersimpan di `useUserSettings` (localStorage `user_settings:{userId}:kkm`) | `useMassInputState.ts` (`useState(75)`), `hooks/useUserSettings.ts` | Guru menaikkan KKM sekali lagi di setiap kunjungan; KKM yang dipilih di Settings bisa "hilang" saat masuk lewat Input Nilai |
| 3 | **Badge kualitas mobile masih hardcode ambang 75/60** ("Baik/Cukup/Kurang") | `Step2_StudentList.tsx` | Label bertentangan dengan KKM yang sedang dipakai grup/ekspor |
| 4 | **Tombol Simpan muncul 4 kali** di satu layar (panel konfigurasi, header daftar siswa, floating bar, footer) dengan label & status yang berbeda-beda | `Step2_Configuration.tsx`, `Step2_StudentList.tsx`, `MassInputPageView.tsx`, `Step2_Footer.tsx` | Guru ragu mana yang "benar"; sulit tahu kenapa tombol tertentu nonaktif |
| 5 | Query daftar siswa **mengambil kolom yang tidak dipakai** layar (`access_code`, `parent_name`, `parent_phone`) | `useMassInputData.ts` (`students` query) | Data siswa yang tidak perlu terkirim ke klien (prinsip data minimal) |
| 6 | **Dead code** di folder fitur: 5 dari 6 komponen `bulk-grade-input/` tidak diimpor siapa pun; file `.bak` 471 baris masih ter-commit | `src/components/pages/bulk-grade-input/components/*`, `hooks/useMassInputMutations.ts.bak` | Kebingungan kontributor; dua sumber logika simpan yang mirip tapi berbeda |
| 7 | **Duplicate guard kuis/sikap memakai jendela 10 menit** pada `created_at`, tanpa penjelasan di UI | `DUPLICATE_GUARD_WINDOW_MINUTES = 10`, `getDuplicateGuardWindowIso()` | Guru tidak paham kenapa poin "tidak tersimpan"; perilaku belum diputuskan sebagai aturan produk |
| 8 | **`MassInputPageView` 574 baris dengan ±90 prop** | `MassInputPageView.tsx` | Setiap penambahan fitur menyentuh 5+ file; risiko regresi tinggi |
| 9 | **Tidak ada jalur pemulihan draft** kalau tab ditutup/di-reload saat mengisi nilai di mode selain `subject_grade` | `useMassInputState.ts` (draft hanya untuk `subject_grade`) | Kehilangan pekerjaan pada mode kuis/sikap/pelanggaran (jumlah siswa banyak, satu per satu) |

### 1.1. Sudah Dieksekusi Sebelum Dokumen Ini

Sebagai baseline, perbaikan berikut sudah masuk pada 2026-09-17 dan tidak lagi bagian dari ruang lingkup PRD ini:

| Perbaikan | File |
|-----------|------|
| KKM di-seed dari pengaturan guru, lalu dipakai konsisten di grouping "Tuntas/Belum Tuntas", mini chart, dan ekspor Excel | `useMassInputViewModel.ts`, `Step2_StudentList.tsx`, `Step2_Footer.tsx` |
| Tombol Simpan nonaktif + tooltip jelas saat masih ada nilai tidak valid | `useMassInputViewModel.ts` |
| Baris yang sedang diisi "dipin" di filter **Belum/Sudah Dinilai** (baris tidak lagi hilang di tengah pengetikan) | `useMassInputViewModel.ts`, `Step2_StudentList.tsx` |
| Auto-focus tidak lagi menyerobot kursor setiap panjang daftar berubah | `Step2_StudentList.tsx` |
| Simpan nilai menghidupkan ulang baris soft-deleted (menghindari pelanggaran unique constraint `uq_academic_records_student_subject_assessment_semester`) | `useMassInputMutations.ts` |
| "Catatan umum" yang dibiarkan kosong tidak lagi menghapus catatan per-siswa yang tersimpan | `useMassInputMutations.ts` |
| `assessmentNames` dari DB dipakai di dropdown "Nama Penilaian" (sebelumnya query jalan tanpa hasil dipakai) | `Step2_Configuration.tsx` |
| Atribut aksesibilitas `aria-invalid` / `aria-describedby` / `role="alert"` pada input nilai | `Step2_StudentList.tsx` |

### 1.2. Fase 1–2 Sudah Dikerjakan

Setelah dokumen ini ditulis: butir 1–6 di §1 selesai, butir 7 sebagian (dialog pratinjau sudah ada, aturan finalnya belum diputuskan). Yang tersisa adalah butir 8 (5.8 refactor struktur), butir 9 (5.7 draft semua mode), dan 5.9.

---

## 2. Tujuan

1. **Nol kehilangan pekerjaan guru** — semua aksi merusak (bersihkan, hapus, keluar halaman) harus disengaja dan punya jalan pulang (undo/draft).
2. **Satu sumber kebenaran KKM** untuk seluruh layar input, ekspor, dan pengaturan.
3. **Satu aksi utama per layar** supaya guru langsung tahu cara menyimpan.
4. **Data minimal & rapi** — hanya kolom yang dipakai yang dikirim ke klien, dan tidak ada kode mati di folder fitur.
5. **Struktur kode yang bisa tumbuh** — halaman dipecah per mode sehingga perubahan pada satu mode tidak menyentuh mode lain.

---

## 3. Pengguna Target

| Role | Kebutuhan Utama |
|------|-----------------|
| **Guru Mapel** | Mengisi nilai satu kelas dengan cepat (input massal, impor Excel, tempel dari AI), tidak kehilangan hasil ketikan |
| **Wali Kelas** | Mengisi sikap/keaktifan dan pelanggaran lintas kelas, perlu konfirmasi data yang sudah tercatat hari ini |
| **Guru BK** | Pelanggaran lintas kelas + ekspor laporan pelanggaran |
| **Kepala Madrasah / Waka** | Mencetak rapor massal & rekap nilai akademik, memastikan ambang ketuntasan (KKM) konsisten |

---

## 4. Ruang Lingkup

**Termasuk:** 9 butir masalah di §1 (P0–P2), termasuk refactor struktur dan pembersihan dead code.

**Tidak termasuk:**
- Perubahan skema database (tidak ada tabel/kolom baru).
- Perubahan aturan penilaian (KKM tetap ambang tunggal per guru; ketuntasan per-mapel dibahas di `docs/prd-analisis-akademik-improve.md`).
- Alur Pemulihan (`/pemulihan`) dan Trash, kecuali titik singgung restore nilai.
- Redesain visual menyeluruh; perubahan UI dibatasi pada aksi simpan/bersihkan dan konsistensi KKM.

---

## 5. Fitur yang Diusulkan

### 5.0. Status Implementasi

| # | Fitur | Status | Bukti |
|---|-------|--------|-------|
| 5.1 | Anti-kehilangan data (guard + undo) | ✅ Selesai | `useMassInputViewModel.ts`, `MassInputPageView.tsx` (dialog + undo bar), `Step2_Footer.tsx` |
| 5.2 | Satu sumber kebenaran KKM | ✅ Selesai | KKM di-seed & ditulis balik ke `useUserSettings`; badge mobile memakai KKM |
| 5.3 | Konsolidasi aksi simpan | ✅ Selesai | Tombol Simpan hanya di floating save bar; tombol duplikat di panel & header daftar dihapus |
| 5.4 | Persempit query daftar siswa | ✅ Selesai | `useMassInputData.ts` tidak lagi mengambil `access_code`, `parent_name`, `parent_phone` |
| 5.5 | Pembersihan dead code | ✅ Selesai | Folder `bulk-grade-input/` dihapus (5 komponen + `GradeInputSkeletons.tsx`), `.bak` dihapus, `ImportPreviewModal` dipindah ke `mass-input/components/` |
| 5.6 | Aturan duplicate guard yang jelas | 🟡 Sebagian | Dialog pratinjau kini dipakai untuk `violation`, `quiz`, dan `attitude`; bug override "Tetap Simpan Semua" di mode kuis diperbaiki. Aturan final (per hari vs per jendela waktu) masih Open Question #4 |
| 5.7 | Draft untuk semua mode | ⏳ Belum | — |
| 5.8 | Pecah halaman per mode | ⏳ Belum | — |
| 5.9 | Ringkasan sebelum simpan | ⏳ Belum | — |

Tes regresi baru untuk 5.6 & bagian revive pada §6.2 ada di `tests/unit/useMassInputMutations.test.tsx`.

### 5.1. Anti-Kehilangan Data (Guard) — Priority: P0

**Deskripsi:** Semua aksi yang membuang input harus melewati konfirmasi yang menyebut jumlah data yang akan hilang, dan dikembalikan dalam jendela undo bila memungkinkan.

**Perubahan:**
- "Bersihkan" (footer) dan ✕ (floating bar) → dialog konfirmasi: *"Hapus 24 nilai yang belum disimpan? Nilai yang sudah tersimpan tidak terpengaruh."* dengan tombol `Batalkan` / `Ya, bersihkan`.
- Setelah dibersihkan, tampilkan toast **Undo** (pola `components/feedback-system/DeletableWithUndo.tsx`) selama 8 detik untuk mengembalikan snapshot `scores` sebelumnya.
- Tombol "Kembali" (`handleBack`, yang juga menghapus draft `sessionStorage`) ikut memakai konfirmasi `useWarnUnsavedChanges` yang sudah ada, bukan hanya `beforeunload`.
- Kunci `ByPass` guard eksplisit: `confirmDeleteModal` dipertahankan sebagai satu-satunya jalur hapus permanen.

**Acceptance Criteria:**
- [ ] Klik ✕ atau "Bersihkan" saat ada minimal 1 nilai → dialog muncul dengan jumlah yang benar.
- [ ] "Batalkan" tidak mengubah apa pun (scores, dirty flag, draft).
- [x] Setelah konfirmasi, indikator Undo (bar 8 detik di atas save bar) mengembalikan seluruh nilai.

> Catatan implementasi: undo memakai bar di dalam halaman, bukan toast. `feedback-system/ToastSystem` (yang punya `undoAction`) tidak dipasang di `AppProviders`, sedangkan `hooks/useToast` tidak mendukung tombol aksi.
- [ ] Klik "Kembali" / navigasi keluar saat dirty → konfirmasi, dan draft tidak terhapus bila guru memilih bertahan.
- [ ] Tidak ada jalur lain yang memanggil `setScores({})` / `setSelectedStudentIds(new Set())` tanpa konfirmasi.

**Estimasi:** M (1 sprint), file: `MassInputPageView.tsx`, `Step2_Footer.tsx`, `useMassInputViewModel.ts`.

---

### 5.2. Satu Sumber Kebenaran KKM — Priority: P0

**Deskripsi:** KKM yang diubah guru dari panel Input Nilai harus menjadi nilai yang berlaku di seluruh aplikasi dan bertahan antar sesi.

**Perubahan:**
- Panel Input Nilai memakai `useUserSettings` sebagai penyimpan: perubahan KKM di-debounce (≈1 detik) lalu `updateSettings({ kkm })`, dengan indikator "KKM tersimpan" alih-alih toast berulang.
- Badge kualitas mobile di `Step2_StudentList.tsx` memakai `kkm` sebagai ambang "Tuntas/Belum Tuntas" (menggantikan hardcode 75/60) atau ditampilkan sebagai ambang relatif terhadap KKM.
- Nilai KKM default tetap 75 (`DEFAULT_KKM`) bila guru belum pernah menyetel.

**Acceptance Criteria:**
- [ ] Ubah KKM di Input Nilai → buka Pengaturan → nilai yang sama tampil di sana.
- [ ] Reload halaman → KKM tetap nilai terakhir guru, tidak balik ke 75.
- [ ] Badge mobile, header grup, mini chart, modal Katrol, dan ekspor Excel memakai KKM yang sama.
- [ ] Perubahan KKM tidak memicu toast "Pengaturan berhasil disimpan" berulang saat guru mengetik.
- [ ] Bila `user_settings` gagal dimuat, layar tetap berfungsi dengan KKM 75 (tidak ada crash/blocked).

**Estimasi:** S–M, file: `useMassInputState.ts`, `useMassInputViewModel.ts`, `Step2_StudentList.tsx`.

---

### 5.3. Konsolidasi Aksi Simpan — Priority: P0

**Deskripsi:** Satu tombol Simpan utama per layar; sisanya menjadi sekunder/tersembunyi.

**Perubahan:**
- Pertahankan **floating save bar** (portal, sudah paling menonjol) sebagai satu-satunya tombol Simpan primer di step 2.
- Tombol di `Step2_Configuration` (khusus `selectedClass === 'all'`) dan di header `Step2_StudentList` diubah menjadi aksi non-duplikat: salah satu dihapus, atau diubah menjadi tombol "Simpan & Lanjut ke siswa berikutnya" hanya untuk mode `subject_grade`.
- Footer menyimpan ringkasan + aksi sekunder (ekspor, grafik, katrol, hapus) tanpa tombol Simpan kedua.
- Status disabled/loading seragam: ambil dari satu sumber (`isSubmitDisabled`, `submitButtonTooltip`) dan tampilkan alasannya di semua titik.

**Acceptance Criteria:**
- [ ] Pada satu layar hanya ada satu tombol dengan label simpan (atau satu primer + satu variasi yang jelas berbeda).
- [ ] Semua tombol simpan punya status loading/disabled identik untuk aksi yang sama.
- [ ] Tooltip alasan disabled muncul di tombol Simpan primer.
- [ ] Tidak ada perubahan perilaku penyimpanan (mode & payload sama).

**Estimasi:** M, file: `MassInputPageView.tsx`, `Step2_Configuration.tsx`, `Step2_StudentList.tsx`, `Step2_Footer.tsx`.

---

### 5.4. Persempit Query Daftar Siswa — Priority: P1

**Deskripsi:** Kirim hanya kolom yang dipakai layar input.

**Perubahan:**
- `students` query di `useMassInputData.ts`: `select('id, name, class_id, user_id, gender, avatar_url')` (hapus `access_code`, `parent_name`, `parent_phone`).
- Cek konsumen: `handlePrintBulkReports`, `handlePrintGrades`, `ViolationExportPanel`, `handleAiParse`, dan `ImportPreviewModal` hanya memakai `id`, `name`, `class_id`, `gender`, `avatar_url`.
- Bila ada konsumen yang butuh kolom tambahan, ambil lewat query terpisah saat aksi dijalankan (bukan di pemuatan awal).

**Acceptance Criteria:**
- [ ] Daftar siswa, pencarian, avatar, badge kelas, impor Excel, ekspor Excel, cetak rapi, dan rekap nilai tetap berfungsi.
- [ ] `access_code` / `parent_phone` tidak ada di payload network saat membuka `/input-massal`.
- [ ] Tidak ada `any`/cast baru untuk menutupi perubahan tipe.

**Estimasi:** S, file: `useMassInputData.ts`.

---

### 5.5. Pembersihan Dead Code Fitus — Priority: P1

**Deskripsi:** Folder fitur tidak lagi memuat komponen yang tidak terpakai dan salinan logika lama.

**Perubahan:**
- Hapus `bulk-grade-input/components/{GradeInputGrid,AIPasteModal,QuickActionsToolbar,SettingsCard,StatsPanel}.tsx` (tidak diimpor siapa pun; hanya `ImportPreviewModal` yang dipakai).
- Pindahkan `ImportPreviewModal.tsx` ke `src/components/pages/mass-input/components/` agar fitur berada di satu folder.
- Hapus `src/components/pages/mass-input/hooks/useMassInputMutations.ts.bak` (471 baris salinan lama, masih ter-commit).
- Jalankan `npm run audit:dead` untuk memastikan tidak ada export mati baru.

**Acceptance Criteria:**
- [ ] `rg "bulk-grade-input"` hanya menyisakan nol hasil (atau satu folder yang benar-benar dipakai).
- [ ] Tidak ada file `.bak` di `src/`.
- [ ] `npx tsc -b --noEmit`, `npm run lint`, dan `npm test` hijau.
- [ ] Alur impor Excel → preview → terapkan nilai tidak berubah.

**Estimasi:** S, file: `src/components/pages/bulk-grade-input/**`, `MassInputPageView.tsx`.

---

### 5.6. Aturan Duplicate Guard yang Jelas — Priority: P1

**Deskripsi:** Guru harus tahu data mana yang dilewati dan mengapa.

**Perubahan:**
- Ganti jendela waktu implisit menjadi aturan produk yang eksplisit: **satu poin keaktifan/sikap identik (nama + kategori + tanggal) per siswa**, atau **maksimal N per hari** (parameter konstanta bernama).
- Sebelum menyimpan, tampilkan ringkasan: *"12 siswa akan disimpan · 3 dilewati (sudah tercatat hari ini)"* dengan aksi `Lihat` dan `Tetap simpan` (pola dialog duplikat pelanggaran yang sudah ada).
- Terapkan pola dialog yang sama untuk mode `quiz` dan `attitude` seperti mode `violation`.

**Acceptance Criteria:**
- [ ] Dialog pratinjau muncul saat ada duplikat, menyebut jumlah simpan/dilewati dan nama siswanya.
- [ ] "Tetap simpan" (bypass) menulis seluruh data terpilih.
- [ ] "Lewati yang duplikat" menulis hanya data baru.
- [ ] Aturan terdokumentasi di PRD/dokumen fitur, bukan hanya di konstanta.

**Estimasi:** M, file: `useMassInputMutations.ts`, `MassInputPageView.tsx`.

---

### 5.7. Pemulihan Draft untuk Semua Mode Input — Priority: P1

**Deskripsi:** Draft `sessionStorage` saat ini hanya untuk `subject_grade` (`guru_cerdas_subject_grade_draft`).

**Perubahan:**
- Generalisasi draft: satu kunci per mode (`guru_cerdas_draft:{mode}`) berisi konfigurasi + pilihan/poin yang belum disimpan.
- Saat kembali ke `/input-massal`, tawarkan pemulihan: *"Lanjutkan pengisian Kuis 'Aktif bertanya' (18 siswa)?"*.
- Bersihkan draft setelah simpan sukses (`clearSubjectGradeDraft` → `clearDraft(mode)`).

**Acceptance Criteria:**
- [ ] Reload/tutup tab saat mengisi mode `quiz`/`attitude`/`violation` → draft ditawarkan kembali.
- [ ] Draft tidak pernah menimpa data tersimpan; hanya melengkapi pilihan yang belum disimpan.
- [ ] Draft dibersihkan setelah simpan sukses dan setelah guru memilih "Mulai baru".

**Estimasi:** M–L, file: `useMassInputState.ts`, `useMassInputViewModel.ts`, `Step1_ModeSelection.tsx`.

---

### 5.8. Pecah Halaman per Mode — Priority: P1 (selaras dengan 5.3)

**Deskripsi:** `MassInputPageView` 574 baris & ±90 prop dipecah menjadi komponen per mode dengan view-model masing-masing, tanpa mengubah perilaku.

**Perubahan:**
- Ekstrak blok mode ke `src/components/pages/mass-input/components/modes/`:
  - `SubjectGradePanel`, `QuizPanel`, `AttitudePanel`, `ViolationPanel`, `ExportPanel`.
- Ekstrak state panel yang berpindah bersama mode (mis. `quizInfo`, `attitude*`, `subjectGradeInfo`) menjadi sub-view-model (`useSubjectGradeState`, `useQuizState`, ...) atau tetap di `useMassInputState` dengan tipe bernama (bukan inline object type berulang di interface prop).
- Ganti prop pass-through (~90 prop) dengan objek tipe bernama + `children`/context internal halaman.
- Lakukan bertahap: satu mode per PR, semua tes lama tetap hijau.

**Acceptance Criteria:**
- [ ] `MassInputPageView.tsx` ≤ ~200 baris; tidak ada interface prop > 25 field.
- [ ] Tidak ada perubahan perilaku (semua tes + manual checklist mode lulus).
- [ ] Setiap PR pemecahan bisa di-review tanpa menyentuh mode lain.

**Estimasi:** L (2–3 sprint, bertahap).

---

### 5.9. Ringkasan Kelengkapan Sebelum Simpan — Priority: P2

**Deskripsi:** Sebelum menyimpan nilai satu kelas, tampilkan ringkasan singkat: berapa siswa dinilai, rata-rata, jumlah di bawah KKM, dan siswa yang belum diisi.

**Perubahan:**
- Manfaatkan `calculateGradeStats` (`src/utils/gradeValidator.ts`) + `GradeDistributionMini` yang sudah ada di modal ringkasan sebelum menyimpan (bukan hanya grafik opsional).
- CTA "Kembali mengisi" / "Simpan sekarang".

**Acceptance Criteria:**
- [ ] Ringkasan muncul sekali per aksi Simpan (dapat dimatikan lewat preferensi).
- [ ] Angka ringkasan konsisten dengan daftar siswa & KKM aktif.
- [ ] Guru dapat menyimpan langsung dari ringkasan tanpa langkah tambahan.

**Estimasi:** S–M.

---

## 6. Rincian Teknis

### 6.1. Titik Perubahan Utama

| Area | File |
|------|------|
| Komposisi halaman & aksi | `src/components/pages/MassInputPage.tsx`, `mass-input/MassInputPageView.tsx` |
| State & draft | `mass-input/hooks/useMassInputState.ts`, `hooks/useMassInputViewModel.ts` |
| Penyimpanan | `mass-input/hooks/useMassInputMutations.ts` |
| Panel konfigurasi & daftar siswa | `mass-input/components/Step2_Configuration.tsx`, `Step2_StudentList.tsx` |
| Aksi footer & ekspor | `mass-input/components/Step2_Footer.tsx` |
| Pengaturan guru (KKM) | `src/hooks/useUserSettings.ts`, `src/components/settings/DataManagementSection.tsx` |

### 6.2. Data Flow (tidak berubah)

```
useMassInputData (classes, students, existingGrades, ...)
        ↓
useMassInputState (form state + draft sessionStorage)
        ↓
useMassInputViewModel (derive: filter, KKM, validasi, aksi simpan)
        ↓
MassInputPageView → Step2_Configuration / Step2_StudentList / Step2_Footer
        ↓
useMassInputMutations → Supabase (academic_records, quiz_points, violations, attitude_records) → invalidate query cache
```

**Perubahan skema database: tidak ada.** Temuan 2026-09-17 yang sudah diperbaiki (revive baris soft-deleted) memastikan kode selaras dengan unique constraint `uq_academic_records_student_subject_assessment_semester` dari migration `20260913210000_add_unique_constraint_academic_records.sql`, yang **masih menunggu `db push`** (lihat `docs/DB_PUSH_PENDING_MIGRATIONS_PLAN.md`).

### 6.3. Dependensi Baru

Tidak ada. Semua kebutuhan memakai komponen/utility yang sudah ada (`Modal`, `ConfirmationDialog`, `DeletableWithUndo`, `useFeedbackToast`, `badge`, `GradeDistributionMini`, `useUserSettings`).

---

## 7. UX Flow

### 7.1. Guru mengisi nilai satu kelas lalu berubah pikiran

```
/input-massal → Pilih mode "Input Nilai Mapel"
    ↓
Panel Konfigurasi: kelas, mapel, penilaian, KKM (tersimpan ke pengaturan)
    ↓
Daftar siswa (filter "Belum Dinilai") → ketik nilai satu per satu
    ↓
Ragu pada satu nilai → klik ✕ "Batalkan pilihan"
    ↓
Dialog: "Hapus 24 nilai yang belum disimpan?" → Batalkan
    ↓
Lanjut mengisi → Simpan
```

### 7.2. Guru menyimpan nilai yang ada duplikat (kuis/sikap)

```
Pilih siswa → Simpan
    ↓
Dialog: "12 disimpan · 3 dilewati (sudah tercatat hari ini)"
   [Lihat daftar] [Lewati yang duplikat] [Tetap simpan semua]
    ↓
Toast hasil + Undo (sesuai mode)
```

### 7.3. Waka mencetak rekap

```
Mode "Cetak Nilai Akademik" → pilih kelas + mapel + semester
    ↓
Daftar siswa menampilkan nilai tersimpan (KKM aktif untuk status tuntas)
    ↓
Cetak → PDF rekap dengan KKM yang sama seperti di layar
```

---

## 8. Metrics of Success

| Metric | Target | Cara Ukur |
|--------|--------|-----------|
| Kasus "nilai hilang setelah klik bersihkan" | 0 laporan | Laporan guru + audit log |
| Guru menyelesaikan pengisian per kelas | +20% penyelesaian | `daily_input_log` (jumlah siswa per input) |
| Perubahan KKM yang konsisten | 100% sama antara Pengaturan & Input Nilai | Uji manual + unit test `kkm` |
| Ukuran payload daftar siswa | −3 kolom (akses, orang tua) | DevTools/inspect jaringan |
| Waktu loading route `/input-massal` | tidak memburuk | Lighthouse/LHCI (`lighthouserc.cjs`) |
| Dead code di folder fitur | 0 komponen tak terpakai | `npm run audit:dead` |
| Baris `MassInputPageView` | ≤ 200 baris | Ukur file |

---

## 9. Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|--------------|--------|----------|
| Refactor 5.8 menyentuh logika simpan dan menimbulkan regresi pada mode jarang dipakai (`academic_print`, `bulk_report`) | Medium | High | Pecah per mode + per PR; tambah tes per mode sebelum memindahkan kode |
| Dialog konfirmasi baru dianggap mengganggu pada alur cepat | Medium | Medium | Hanya untuk aksi merusak; sediakan Undo agar tidak perlu konfirmasi ganda |
| Sinkronisasi KKM (5.2) menulis pengaturan guru tanpa disadari | Medium | Medium | Debounce + indikator "KKM tersimpan"; nilai default tetap 75 |
| Perubahan duplicate guard (5.6) mengubah ekspektasi guru lama | Medium | Medium | Umumkan di catatan rilis; default tetap "lewati duplikat" dengan opsi bypass |
| Persempit kolom siswa (5.4) mematahkan layar lain yang memakai `studentsData` | Low | Medium | Audit konsumen lewat `rg "studentsData"` sebelum merge; tes ekspor & cetak |
| `db push` migration constraint berjalan setelah PRD ini | Medium | High | Sudah ditangani (§6.2); tambahkan tes integrasi "hapus → isi ulang → simpan" |

---

## 10. Timeline Usulan

| Fase | Fitur | Estimasi |
|------|-------|----------|
| **Fase 1 (P0)** | 5.1 Anti-kehilangan data, 5.2 Satu sumber KKM, 5.3 Konsolidasi aksi simpan | Sprint 1–2 |
| **Fase 2 (P1)** | 5.4 Query siswa minimal, 5.5 Pembersihan dead code, 5.6 Duplicate guard jelas | Sprint 3 |
| **Fase 3 (P1)** | 5.7 Draft semua mode, mulai 5.8 pecah halaman (mode `violation` lebih dulu) | Sprint 4–5 |
| **Fase 4 (P1–P2)** | Lanjutan 5.8 (`subject_grade`, `quiz`, `attitude`), 5.9 ringkasan sebelum simpan | Sprint 6 |

---

## 11. Open Questions

1. **Undo vs konfirmasi:** apakah cukup salah satu (Undo saja, tanpa dialog) untuk aksi "Bersihkan"? Dialog + Undo lebih aman tapi dua langkah.
2. **KKM per mapel:** KKM tetap satu nilai per guru, atau perlu override per mapel? Bila ya, sebaiknya digabung dengan PRD Analitik Akademik.
3. **Draft lintas perangkat:** draft saat ini `sessionStorage` (hilang saat PWA ditutup). Perlu pindah ke `localStorage`/Supabase offline queue?
4. **Aturan duplicate guard final:** maksimum 1 poin identik per siswa per hari, atau jendela waktu (mis. 30 menit) yang bisa dikonfigurasi?
5. **Urutan refactor 5.8:** mode mana yang lebih dulu dipecah, dan apakah `bulk_report`/`academic_print` dipisah ke halaman sendiri?
6. **Tes:** apakah PRD ini perlu tes integrasi baru "hapus nilai → isi ulang → simpan sukses" sebelum `db push` dijalankan?

---

## 12. Referensi Kode Terkait

| File | Keterangan |
|------|------------|
| `src/components/pages/MassInputPage.tsx` | Entry page (`/input-massal`) |
| `src/components/pages/mass-input/MassInputPageView.tsx` | View step 1 & 2, modal, floating save bar (kandidat refactor 5.8) |
| `src/components/pages/mass-input/hooks/useMassInputState.ts` | State + draft `sessionStorage` + guard `beforeunload` |
| `src/components/pages/mass-input/hooks/useMassInputViewModel.ts` | Derived state, filter, KKM, validasi, aksi simpan |
| `src/components/pages/mass-input/hooks/useMassInputData.ts` | Query kelas, siswa, nilai, pelanggaran, poin |
| `src/components/pages/mass-input/hooks/useMassInputMutations.ts` | Semua jalur tulis + duplicate guard + ekspor |
| `src/components/pages/mass-input/components/Step2_Configuration.tsx` | Panel konfigurasi per mode (termasuk input KKM) |
| `src/components/pages/mass-input/components/Step2_StudentList.tsx` | Daftar siswa, input nilai, sorting/grouping, mini chart |
| `src/components/pages/mass-input/components/Step2_Footer.tsx` | Ringkasan, ekspor, hapus terpilih, simpan |
| `src/hooks/useUserSettings.ts` | Sumber KKM guru (`localStorage` per user) |
| `src/utils/gradeValidator.ts` | Validasi nilai + statistik + KKM default |
| `src/utils/gradeExporter.ts` | Ekspor Excel (kolom status memakai KKM) |
| `src/components/ui/UnifiedGradeAdjustmentModal.tsx` | Katrol nilai & pratinjau cetak |
| `supabase/migrations/20260913210000_add_unique_constraint_academic_records.sql` | Unique constraint nilai (masih pending `db push`) |
| `tests/unit/useMassInputMutations.test.tsx` | Tes jalur simpan yang harus tetap hijau |
| `tests/unit/massInputQuizPoints.test.ts`, `tests/unit/massInputAttitudePoints.test.ts` | Tes poin kuis & sikap |

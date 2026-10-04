# Audit ulang Input Penilaian — 4 Oktober 2026

## Ruang lingkup dan cara pemeriksaan

Review memakai playbook `portal-guru` dan `code-reviewer`: membaca alur konfigurasi, draft, penyimpanan nilai/poin/sikap, serta ekspor rapor; kemudian mencocokkan dengan katalog dan agregat data produksi Supabase. Snapshot kode: HEAD `357e646796c2ed96213ab562aa9adc3785fcc0bc` beserta perubahan lokal yang sudah ada saat audit.

Database hanya dibaca. Tidak ada nilai siswa yang diubah, notifikasi yang dikirim, atau perbaikan aplikasi yang diterapkan dalam audit ini. Skenario reproduksi memakai data sintetis dan mock. Audit visual pada perangkat nyata serta simulasi akses produksi antarperan belum dilakukan.

PRD September mencatat sejumlah perbaikan sudah selesai. Review ini tidak menganggap semuanya masih rusak: sinkronisasi KKM, validasi rentang nilai, konfirmasi Bersihkan, dan pembatasan kolom siswa sudah terlihat di kode. Namun, perlindungan kehilangan nilai masih memiliki celah berikut.

## Ringkasan prioritas

P1 berarti perlu ditangani lebih dahulu karena menyangkut kehilangan pekerjaan atau ketepatan nilai/rapor. P2 berarti alur tertentu masih menghasilkan catatan yang tidak konsisten.

| No. | Prioritas | Temuan | Bukti utama |
|---|---|---|---|
| 1 | P1 | Semester pilihan guru ditimpa trigger | Definisi trigger produksi dan payload simpan |
| 2 | P1 | Draft pulih lalu tertimpa nilai dari server | Reproduksi hook: draft 90 berubah menjadi 70 |
| 3 | P1 | Ganti kelas/semester/nama penilaian tertentu membuang nilai tanpa konfirmasi | Tiga reproduksi hook |
| 4 | P1 | Simpan mengirim ulang nilai yang tidak diedit, tanpa pemeriksaan konflik | Reproduksi payload dan skema produksi |
| 5 | P1 | Rapor massal mengambil data tanpa pagination | Batas API 1.000; 17 kelompok kelas pada semester aktif melampaui batas |
| 6 | P2 | Sinkronisasi sikap bisa gagal tanpa diketahui; catatan tidak masuk rekam sikap | Reproduksi respons error Supabase |
| 7 | P2 | Tanggal awal menjadi kemarin sebelum pukul 07.00 WIB | Reproduksi waktu 06.30 WIB |

## 1. Semester pilihan ditimpa saat penyimpanan

**Lokasi:** `supabase/migrations/20260106190000_backfill_academic_semester_id.sql:25`, `src/components/pages/mass-input/hooks/mutations/useSubjectGradeMutation.ts:101`, dan `src/components/pages/mass-input/components/Step2_Configuration.tsx:344`.

UI membolehkan memilih semester lama dan mutation mengirim `semester_id` pilihan tersebut. Namun, fungsi produksi `set_academic_record_semester_id()` yang dipasang pada `BEFORE INSERT` selalu menetapkan ulang semester berdasarkan `NEW.created_at`, atau semester aktif sebagai cadangan. Fungsi tidak mempertahankan semester yang secara eksplisit dikirim guru.

**Skenario:** guru memilih semester sebelumnya lalu mengisi nilai baru hari ini. Semester hasil simpan dapat menjadi semester sekarang, sehingga nilai tidak muncul ketika guru tetap melihat semester pilihannya. Audit ini membuktikan aturan trigger, bukan menghitung jumlah nilai historis yang salah; maksud awal guru tidak bisa disimpulkan dari baris yang tersimpan.

Masalah serupa ada pada `set_quiz_point_semester_id()`: trigger menggunakan `created_at`, bukan `quiz_date`. Mutation poin juga menggunakan semester aktif. Input bertanggal mundur lintas semester karena itu belum aman. Pada snapshot produksi, belum ditemukan poin/sikap dengan tanggal di luar rentang semester tersimpan.

**Perbaikan:** pertahankan semester eksplisit yang valid untuk nilai akademik; untuk aktivitas bertanggal, tentukan semester dari tanggal aktivitas. Validasi periode dan hak akses di server. Periksa jalur insert maupun upsert serta semester terkunci sebelum menerapkan migrasi.

## 2. Draft belum aman dipulihkan

**Lokasi:** `src/components/pages/mass-input/hooks/useMassInputState.ts:165` dan `src/components/pages/mass-input/hooks/useMassInputViewModel.ts:116`.

Draft dibaca dari `sessionStorage`, tetapi efek yang berjalan ketika hook dipasang langsung mengubah `isScoresDirtyRef.current` menjadi `false`. Saat hasil query nilai datang, efek sinkronisasi menganggap nilai lokal bersih dan menggantinya dengan isi database.

**Reproduksi:** simpan draft nilai 90, buka halaman, kemudian query mengembalikan nilai lama 70. Nilai pada form berubah menjadi 70. Ini bukan hanya potensi teoretis; skenario hook berhasil direproduksi.

**Perbaikan:** pisahkan status memuat server, memulihkan draft, dan mengedit. Pertahankan status perubahan pada draft yang dipulihkan dan tawarkan Pulihkan/Buang dengan identitas kelas, mapel, penilaian, semester, serta waktu draft.

## 3. Konfirmasi belum mencakup semua pergantian konteks

**Lokasi:** `src/components/pages/mass-input/hooks/useMassInputViewModel.ts:334`, `:347`, `:449`; reset pada `src/components/pages/mass-input/hooks/useMassInputState.ts:135` dan `:148`.

Tiga jalur yang direproduksi setelah mengetik nilai 95:

- **Ganti kelas:** setter langsung diteruskan ke UI; nilai direset tanpa dialog.
- **Ganti semester:** handler hanya memeriksa perubahan mapel/nama penilaian; semester lolos tanpa dialog.
- **PH1 menjadi PH10:** pemeriksaan awalan menganggap perubahan sebagai proses mengetik, tetapi perubahan identitas penilaian tetap mengosongkan nilai.

Ketiganya menghasilkan `scores = {}` dan tidak membuka konfirmasi. Draft lama mungkin masih tersimpan, tetapi pemulihannya juga terkena temuan 2.

**Perbaikan:** satu fungsi pergantian konteks untuk kelas, mapel, semester, dan penilaian. Pisahkan teks nama yang sedang diketik dari identitas penilaian yang sudah dipilih. Berikan pilihan Simpan draft/Buang/Batal sebelum konteks berubah.

## 4. Perubahan dari perangkat lain dapat tertimpa

**Lokasi:** `src/components/pages/mass-input/hooks/mutations/useSubjectGradeMutation.ts:40` dan `:111`.

Mutation membangun payload dari semua nilai terisi, bukan hanya nilai yang berubah. Upsert tidak menyertakan pemeriksaan versi. Skema produksi memiliki kolom `version`, tetapi seluruh 2.436 nilai aktif masih bernilai 1 dan katalog trigger tidak menunjukkan mekanisme peningkatan/pemeriksaan versi pada jalur ini.

**Skenario:** perangkat A dan B membuka nilai Siswa 1 = 70. A menyimpan 90. B hanya mengubah Siswa 2, tetapi payload B tetap mengirim Siswa 1 = 70. Penyimpanan B dapat menimpa nilai 90. Reproduksi memastikan nilai yang tidak diedit memang ikut dikirim; tidak dilakukan percobaan konflik pada data produksi.

Selain itu, tidak ada unique index aktif untuk kombinasi siswa–mapel–penilaian–semester. Dua penyimpanan pertama yang bersamaan dapat sama-sama lolos pemeriksaan awal lalu membuat ID berbeda. Snapshot produksi **tidak memiliki kelompok nilai duplikat** menurut kunci normalisasi yang digunakan aplikasi; ini risiko, bukan klaim duplikat sudah terjadi.

**Perbaikan:** kirim hanya perubahan, periksa versi secara atomik di server, dan tampilkan konflik sebelum menimpa. Tetapkan kunci unik sesuai aturan kolaborasi guru, dengan pemeriksaan data sebelum migrasi. Riwayat undo juga perlu menghormati versi terbaru.

## 5. Rapor massal dapat menggunakan absensi yang terpotong

**Lokasi:** `src/components/pages/mass-input/hooks/mutations/useMassInputExport.ts:44–62`.

Query absensi, nilai, pelanggaran, dan poin mengambil semua siswa terpilih dalam satu permintaan per tabel, tanpa pagination. Respons tersebut langsung dikelompokkan per siswa untuk PDF dan masukan catatan AI.

**Bukti produksi:** konfigurasi PostgREST mengonfirmasi `max_rows = 1000`. Pada semester aktif ada **17 kelompok kelas–semester** dengan lebih dari 1.000 baris absensi; yang terbesar **2.001 baris**. Jika baris tersebut terlihat bagi pengguna dan seluruh kelas dipilih, satu respons tidak cukup untuk membawa seluruh data. PDF tetap dapat dinyatakan berhasil meski sumber absensinya tidak lengkap. Tidak dibuat PDF produksi dalam audit ini.

Untuk seluruh semester, ada 18 kelompok kelas–semester yang melewati batas, dengan maksimum 2.280 baris. Jumlah ini adalah ukuran sumber data, bukan jumlah ekspor yang sudah terbukti salah.

**Perbaikan:** pagination dengan urutan stabil atau agregasi server per siswa/semester, disertai pemeriksaan kelengkapan sebelum PDF dibuat. Terapkan pola yang sama pada tabel lain supaya penambahan data tidak membuka masalah serupa.

## 6. Penyimpanan sikap memberi hasil sukses meski sinkronisasi gagal

**Lokasi:** `src/components/pages/mass-input/hooks/mutations/useAttitudeMutation.ts:27` dan `:105–122`.

Poin utama disimpan ke `quiz_points`, lalu rekam kompatibilitas ditambahkan ke `attitude_records`. Hasil `{ error }` dari insert kedua tidak diperiksa. `try/catch` tidak menangkap kegagalan Supabase yang dikembalikan sebagai nilai respons. Reproduksi dengan error `23505` tetap menghasilkan pesan berhasil.

Unique index produksi `uq_attitude_records` memakai siswa–mapel–nama aktivitas–semester dan **tidak mencakup tanggal**. Mengulangi aktivitas yang sama pada hari berikutnya karena itu dapat berhasil pada poin tetapi ditolak oleh rekam kompatibilitas. Sebelum mengubah kunci, perlu ditentukan apakah tabel tersebut merepresentasikan kejadian harian atau ringkasan semester.

Kolom Catatan pada UI juga diterima sebagai `_attitudeNotes`, lalu tidak dimasukkan ke rekam sikap. Catatan hanya ikut rincian log input harian; jadi catatan tidak sepenuhnya hilang, tetapi tidak tersimpan di tempat yang diharapkan untuk rekam sikap.

**Perbaikan:** tentukan sumber data utama sikap, periksa seluruh error, simpan catatan di entitas yang ditampilkan kembali, dan gunakan transaksi jika kedua tabel wajib konsisten. Jika tabel kompatibilitas tidak wajib, berikan mekanisme sinkronisasi yang dapat dipantau dan dicoba ulang.

## 7. Tanggal awal memakai UTC

**Lokasi:** `src/components/pages/mass-input/hooks/useMassInputState.ts:53`, `:64`, `:73`, beserta reset pada `handleBack`.

`new Date().toISOString().slice(0, 10)` mengambil tanggal UTC. Pada 4 Oktober 2026 pukul 06.30 WIB, ketiga form—keaktifan, sikap, dan pelanggaran—berisi **3 Oktober**. Dampaknya adalah aktivitas tercatat pada hari sebelumnya jika guru tidak mengoreksi tanggal.

**Perbaikan:** satu utilitas tanggal sesuai zona waktu sekolah; pakai juga pada reset dan fallback mutation. Tambahkan cakupan batas tengah malam dan pagi hari.

## Peningkatan alur setelah masalah data diperbaiki

1. **Ringkasan sebelum simpan:** tampilkan jumlah nilai baru, berubah, tetap, kosong, dan tidak valid; kelas/mapel/semester tetap terlihat. Jumlah “telah dinilai” sekarang belum membedakan perubahan yang akan dikirim.
2. **Draft per akun dan konteks:** kunci draft saat ini global (`guru_cerdas_subject_grade_draft`) dan tidak memuat pemilik. Logout di `useAuth.tsx:396` tidak menghapus kunci itu. Ikat draft ke akun dan identitas penilaian, lalu bersihkan ketika keluar; lanjutkan dukungan draft untuk mode lain sesuai PRD. Dampak visual pergantian akun belum diuji pada browser nyata.
3. **Status penyimpanan yang jelas:** bedakan perubahan belum disimpan, draft tersimpan di perangkat, sedang menyimpan, serta berhasil tersimpan di server. Gunakan istilah yang tidak membuat guru mengira draft sudah masuk rapor.
4. **Pisahkan state per mode:** nilai, keaktifan, sikap, pelanggaran, dan ekspor kini berbagi banyak state. Pemisahan bertahap akan mempermudah pengujian pergantian konteks dan mengurangi efek samping lintas mode.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Lulus |
| ESLint | 0 error; 559 warning pada keseluruhan workspace |
| Seluruh tes proyek | 2.483 lulus; 4 gagal dalam `PhWeeklyScheduleView.test.tsx` |
| Build produksi | Lulus |
| Skenario diagnostik audit | 7/7 mereproduksi perilaku bermasalah yang diharapkan oleh pemeriksaan |
| Katalog/schema dan agregat produksi | Dibaca tanpa mutasi |

Empat kegagalan tes jadwal tetap dilaporkan, tidak disembunyikan sebagai hasil suite yang bersih. Skenario diagnostik yang lulus adalah bukti reproduksi bug, bukan bukti bahwa bug sudah diperbaiki. Artefak lokal berada di `.cache/assessment-review/` dan `.cache/assessment-audit-*`; tidak termasuk perubahan produk.

## Urutan yang disarankan

1. Perbaiki penetapan semester dan kelengkapan sumber rapor.
2. Tutup kehilangan draft dan seluruh jalur pergantian konteks.
3. Terapkan penyimpanan perubahan saja dengan pemeriksaan konflik dan aturan unik di database.
4. Rapikan konsistensi sikap serta tanggal, lalu tambahkan ringkasan simpan dan draft per akun/mode.

Migrasi maupun perbaikan data historis perlu preflight tersendiri; audit ini tidak memberikan dasar untuk menghapus atau memindahkan nilai secara massal.

## Status perbaikan (4 Oktober 2026, sore)

Semua temuan sudah ditangani. Kedua migrasi diterapkan ke produksi pada 4 Oktober 2026 (versi `20261004104503` dan `20261004104508`). Uji dalam transaksi yang di-rollback memastikan semester eksplisit dipertahankan dan poin tanpa semester mengikuti `quiz_date`.

| No. | Status | Perubahan |
|---|---|---|
| 1 | Selesai | `20261004104503_preserve_explicit_record_semester.sql`: trigger mempertahankan `semester_id` yang dikirim. Poin tanpa semester ditentukan dari `quiz_date`. Formulir nilai menolak semester terkunci; keaktifan dan sikap memakai semester sesuai tanggal. |
| 2 | Selesai | Draf per akun dan per konteks di `localStorage` (`src/utils/subjectGradeDraftStorage.ts`), kedaluwarsa 7 hari, dihapus saat logout. Status dirty tidak lagi direset saat mount. Sinkronisasi server hanya mengisi kolom yang masih kosong. Banner draf menyediakan **Buang draf**. |
| 3 | Selesai | Pergantian kelas, mapel, nama penilaian, dan semester melewati satu pemeriksaan. Nama mapel/penilaian kustom baru diterapkan saat blur atau Enter. Draf konteks lama tetap tersimpan. |
| 4 | Selesai | Hanya nilai yang berbeda dari baseline yang dikirim. Nilai terbaru dibaca ulang sebelum menulis; perbedaan memunculkan dialog konflik (pakai nilai tersimpan / simpan isian saya). `version` naik pada setiap update. `20261004104508_unique_live_academic_record.sql` menambah unique index, dengan preflight yang membatalkan migrasi bila ada duplikat (snapshot 4 Oktober: 0 kelompok duplikat). |
| 5 | Selesai | `fetchAllPages` dengan `order('id')` untuk semua tabel rapor massal dan rekap nilai. |
| 6 | Selesai | Error `attitude_records` diperiksa. Baris yang sudah ada diperbarui, tabrakan dengan baris guru lain diabaikan, catatan disimpan ke `notes`, dan kegagalan muncul sebagai peringatan. `attitude_records` tetap diperlakukan sebagai rekap per semester sesuai `uq_attitude_records`. |
| 7 | Selesai | `schoolDate()` dipakai untuk nilai awal, reset, dan fallback mutation. |

Peningkatan alur yang ikut dikerjakan: ringkasan "N baru, N diubah" di footer sebelum simpan (no. 1), draf per akun dan konteks (no. 2), serta pembedaan "draf di perangkat" dan "tersimpan" pada banner dan dialog (no. 3). Pemisahan state per mode (no. 4) belum dikerjakan.

Sisa risiko yang diketahui:

- Pemeriksaan konflik dilakukan klien sesaat sebelum upsert, bukan compare-and-swap atomik di database. Jendela balapan tinggal beberapa ratus milidetik; bentrok pada baris baru tertangkap unique index.
- Kunci semester belum ditegakkan di database untuk `academic_records`/`quiz_points`. Backup restore juga menulis ke semester terkunci, jadi trigger sengaja tidak menolaknya.
- Keaktifan dan sikap bertanggal mundur ke semester terkunci belum diblokir di UI.

Bukti: `tests/unit/massInputAssessmentAuditFixes.test.tsx` (17 tes) memeriksa ketujuh skenario audit beserta konflik, draf per akun, dan semester terkunci. Seluruh suite: 2.500 lulus, 4 gagal pada `PhWeeklyScheduleView.test.tsx`, sama dengan sebelum perbaikan. TypeScript dan build lulus.

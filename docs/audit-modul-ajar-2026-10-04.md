# Audit menu Modul Ajar — 4 Oktober 2026

## Cara pemeriksaan

Kode dibaca mulai dari halaman (`ModulAjarCreatorPage`) sampai hook form, generator, antrean AI, template, pratinjau, riwayat, dan endpoint ekspor. Database produksi dibaca tanpa mutasi. Delapan dugaan dibuktikan dengan skenario diagnostik di `.cache/modul-ajar-review/review.test.tsx`; setiap tes lulus selama bug masih ada. Belum ada perubahan kode aplikasi.

Data produksi: 52 modul ajar milik 19 guru. Guru terbanyak punya 27 dokumen. Ukuran rata-rata HTML 52 KB, terbesar 89 KB.

## Ringkasan

| No. | Prioritas | Temuan | Bukti |
|---|---|---|---|
| 1 | P1 | Hasil edit langsung di pratinjau tidak pernah tersimpan | Kode; flag ekspor server tidak aktif di `.env` |
| 2 | P1 | "Lembar Siswa" kehilangan lembar evaluasi | Skenario diagnostik |
| 3 | P1 | Menyusun topik baru memakai TP, pemantik, LKPD, soal, dan rubrik topik sebelumnya | Skenario diagnostik |
| 4 | P1 | Mode AI mengabaikan isian guru dan menimpanya | Skenario diagnostik |
| 5 | P1 | Memulihkan atau menduplikat modul "Manual" mengosongkan isiannya di formulir | Skenario diagnostik |
| 6 | P2 | Gagal menyimpan hasil AI tidak memunculkan pesan apa pun | Skenario diagnostik |
| 7 | P2 | Reset formulir memakai nama sekolah lain dan alokasi waktu 100 menit untuk pelajaran 70 menit | Skenario diagnostik |
| 8 | P2 | Frasa materi insersi KBC berlipat setiap kali menyusun ulang | Skenario diagnostik |
| 9 | P2 | Prompt AI dokumen lengkap tidak memuat kelas, CP, profil, maupun tema KBC | Kode |
| 10 | P2 | Susun ulang dan tombol isi AI mengembalikan teks yang sama selama 1 jam | Kode (cache `modulAjar` 60 menit) |
| 11 | P3 | Duplikat dan sampul Lembar Siswa memakai identitas formulir, bukan dokumen yang tampil | Kode |
| 12 | P3 | Riwayat memuat seluruh HTML semua dokumen saat halaman dibuka | Kode + data produksi |
| 13 | P3 | Jalur non-AI memakai `alert()` dan tidak punya indikator proses | Kode |

## Rincian

### 1. Edit di pratinjau hilang
`ModulAjarPreview` bisa diedit langsung (`contentEditable`). Perubahan hanya masuk ke state halaman. Penyimpanan ke `lesson_plans` hanya ada di jalur ekspor server (`saveDraftAndExport`), dan jalur itu aktif bila `VITE_ENABLE_SERVER_DOCUMENT_EXPORT=true`. Flag ini tidak ada di `.env` lokal dan default-nya mati, sehingga tanda "Perubahan belum disimpan" juga tidak muncul. Akibatnya, edit hilang setelah muat ulang atau memulihkan dokumen lain, dan unduhan PDF/Word dari tab Riwayat memakai versi lama. Nilai flag di Vercel belum dicek.

### 2. Lembar Siswa tanpa evaluasi
`extractStudentHtml` mengambil dua elemen pertama yang gayanya mengandung `dashed`, dengan anggapan keduanya lembar LKPD dan lembar evaluasi. Padahal judul aktivitas di dalam LKPD (`border-bottom: 1px dashed`) dan kotak jawaban `[Kotak ...]` juga bergaris putus-putus. Akibatnya elemen kedua berasal dari dalam LKPD, dan "LEMBAR EVALUASI PENGETAHUAN" hilang dari versi siswa. LKPD bawaan generator selalu memuat judul `###` dan kotak jawaban, jadi kasus ini terjadi pada dokumen biasa.

### 3. Isi topik lama terbawa
Setelah menyusun, `generateManualModulAjar` menulis TP, pertanyaan pemantik, LKPD, dan soal hasil susunan ke kolom `manual*` formulir. Kolom `manual*` selalu diprioritaskan pada penyusunan berikutnya. Guru yang mengganti topik lalu menyusun lagi mendapat dokumen bertopik baru tetapi berisi TP, LKPD, dan soal topik lama. Rubrik juga ikut terbawa, karena kode menulis langsung ke `formState.rubrikAsesmen` (mutasi state) dan rubrik itu berisi nama topik.

### 4. Mode AI menimpa isian guru
`renderPrivateDraftAiModulAjar` membangun dokumen hanya dari keluaran AI, lalu menimpa semua kolom `manual*` dengan hasil AI. TP, LKPD, atau soal yang diketik guru (termasuk hasil tombol isi AI per kolom) tidak dipakai dan hilang dari formulir. Validasi sebelum menyusun justru meminta guru mengisi CP atau TP lebih dulu.

### 5. Pemulihan modul "Manual" terhapus
`resetFormToDraft(plan)` mengisi formulir dari dokumen. Untuk `generation_method = 'Manual'`, efek pemuat bank konten melihat kunci mapel/topik baru, lalu menimpa semua kolom `manual*` dengan isi bank, atau mengosongkannya bila bank tidak punya topik itu. Reset tanpa dokumen juga mengubah mode ke `Manual`, sehingga mengetik topik berikutnya ikut memicu penghapusan ini.

### 6. Kegagalan simpan AI tidak terlihat
`useModulAjarAiJob` memanggil `onSuccess` tanpa `await`. Bila penyimpanan ke `lesson_plans` gagal, status tetap `completed`, `onError` tidak dipanggil, dan muncul unhandled rejection. Guru hanya melihat overlay hilang tanpa dokumen dan tanpa pesan.

### 7. Reset formulir
Reset memakai `satuanPendidikan: 'SD Negeri Cerdas Cendikia'` (nilai awal halaman: `MI Al Irsyad`), jenjang `SD`, alokasi 15/70/15 menit (total 100) untuk 2 JP × 35 menit (70), dan `generationMethod: 'Manual'`. Nama sekolah yang salah ikut tercetak di dokumen.

### 8. Frasa KBC berlipat
TP dari kolom manual sudah berakhiran `(frasa).`. Setiap kali menyusun ulang, frasa itu ditambahkan lagi: `… (cinta ilmu) (cinta ilmu).`

### 9. Konteks AI tidak lengkap
`buildPrompt` hanya mengirim mapel, topik, fase, model, dan metode. Kelas, CP, TP guru, profil pelajar, alokasi waktu, dan tema/materi insersi KBC tidak dikirim, sehingga pendekatan "Berbasis Cinta" tidak tercermin dalam konten AI. Generator per kolom sudah mengirim konteks KBC.

### 10. Cache AI satu jam
`generateGeminiJson` menyimpan respons per prompt selama 60 menit untuk kategori `modulAjar`. Karena prompt yang sama menghasilkan kunci yang sama, menyusun ulang atau menekan tombol isi AI lagi dalam satu jam mengembalikan teks yang persis sama.

### 11–13. Lain-lain
- **Duplikat:** formulir diisi ulang, tetapi pratinjau dan `currentLessonPlanId` masih milik dokumen asal. Sampul Lembar Siswa mengambil mapel, kelas, dan topik dari formulir, bukan dari dokumen yang tampil.
- **Riwayat:** `select('*')` mengambil `generated_content` semua dokumen. Untuk guru dengan 27 dokumen, ini sekitar 1,4 MB setiap kali halaman dibuka.
- **Jalur non-AI:** memakai `alert()` untuk hasil dan error, dan tombol tidak menampilkan proses.

## Risiko di luar menu (perlu verifikasi)

`api/_auth.ts` mengizinkan permintaan tanpa token bila header `Host` atau `X-Forwarded-Host` mengandung `localhost`. Endpoint `api/gemini`, `api/groq`, dan `api/telegram` memakai mode ini. Bila Vercel tidak menimpa `X-Forwarded-Host` dari klien, siapa pun bisa memakai kuota AI tanpa login. Ekspor dokumen tidak terdampak (`allowDevWithoutAuth: false`). Belum diuji ke produksi.

## Urutan perbaikan yang disarankan

1. Temuan 3, 4, 5, dan 8: pisahkan isian guru dari hasil susunan, hentikan mutasi state, dan perbaiki pemuat bank konten.
2. Temuan 2 dan 1: penanda eksplisit untuk lembar LKPD/evaluasi, lalu simpan edit pratinjau.
3. Temuan 6, 7, dan 9: pesan kegagalan, nilai reset, dan konteks prompt AI.
4. Sisanya, termasuk verifikasi risiko auth.

## Status perbaikan (4 Oktober 2026)

Ketiga belas temuan dan risiko auth sudah diperbaiki dengan protokol focused-fix (scope → trace → diagnose → fix → verify).

| No. | Perubahan |
|---|---|
| 3, 4, 5 | Akar bersama: kolom konten tidak menyimpan asal isiannya. `useModulAjarForm` kini mencatat asal tiap kolom (bank, hasil susunan, tombol AI) beserta topiknya. Isian otomatis milik topik lain dihapus saat topik berganti, kecuali sudah diedit guru. Jalur AI memakai kolom milik guru dan hanya mengisi sisanya. Bank konten hanya mengisi kolom kosong. Rubrik bawaan dibuat per dokumen, tidak lagi ditulis ke state. |
| 2 | Lembar LKPD dan evaluasi diberi `data-sheet`. Dokumen lama dikenali dari bingkai `2px dashed`. |
| 1 | Edit di pratinjau disimpan ke `lesson_plans` begitu guru keluar dari teks, dengan status Menyimpan, Tersimpan, atau Gagal. Lembar Siswa menjadi baca-saja. |
| 6 | `useModulAjarAiJob` menunggu penyimpanan. Kegagalan sampai ke `onError`, termasuk pada jalur cache. |
| 7 | `createDefaultFormState` dipakai untuk form baru, reset, dan pemulihan. Nama sekolah diambil dari profil guru, lalu `MI Al Irsyad`. Alokasi waktu 10/50/10 menit. |
| 8 | Frasa insersi ditambahkan sekali; formulir menyimpan TP tanpa frasa. |
| 9 | `generateModulAjarAiContent` menerima konteks: kelas, CP, TP guru, profil, waktu, dan KBC. |
| 10 | Opsi `bypassCache` di `geminiService`, dipakai semua permintaan AI Modul Ajar. |
| 11 | Duplikat mengosongkan pratinjau. Sampul Lembar Siswa memakai identitas dokumen yang tampil. |
| 12 | Riwayat dimuat tanpa HTML; isi dokumen diambil saat dipulihkan atau diunduh. |
| 13 | `alert()` diganti toast; tombol Susun nonaktif selama jalur non-AI berjalan. |
| Auth | `api/_auth.ts` menentukan mode dev hanya dari `NODE_ENV`/`VERCEL_ENV`, bukan dari header `Host`. |

Bukti: `tests/unit/modulAjarAuditFixes.test.tsx` (12 tes; uji mutasi memastikan tes menangkap regresi), tes cache di `geminiService.test.ts`, dan dua tes header palsu di `apiAuth.test.ts`. Seluruh suite: 2.527 lulus. TypeScript dan build lulus, dan lint tanpa warning baru.

Belum diuji di browser sungguhan. Pemeriksaan manual yang disarankan:

1. Susun dokumen topik A, ganti ke topik B, lalu susun lagi. Isi dokumen kedua harus bertopik B.
2. Edit teks di pratinjau, klik di luar dokumen, muat ulang halaman, lalu pulihkan dari Riwayat. Hasil edit harus tetap ada.
3. Buka Lembar Siswa. Lembar evaluasi harus tampil setelah LKPD.

## Lanjutan: peningkatan alur (4 Oktober 2026)

| No. | Perubahan |
|---|---|
| 1 | Menyusun ulang dokumen yang sudah diedit langsung kini meminta konfirmasi. Edit tidak hilang, karena dokumen lama tetap ada sebagai versi sebelumnya. Dokumen yang dipulihkan dianggap sudah diedit bila `updated_at` lebih dari 5 detik setelah `created_at`. |
| 2 | Riwayat dikelompokkan per dokumen (jenis, mapel, topik, kelas). Kartu menampilkan versi terbaru, dan versi lama dibuka lewat "N versi sebelumnya". Data tidak diubah; setiap penyusunan tetap baris baru. |
| 3 | Dugaan penyebab AI jarang dipakai: timeout klien 30 detik untuk semua tugas, padahal satu modul lengkap sering lebih lama. Tugas `modul-ajar` kini mendapat 60 detik (`TASK_TIMEOUT_MS` di `aiProvider`), dan `api/gemini.ts`/`api/groq.ts` mendapat `maxDuration: 60`. Log Vercel belum diperiksa, jadi penyebab ini belum dikonfirmasi. |
| 4 | `findMissingModulAjarParts` memeriksa TP, minimal dua langkah kegiatan inti, LKPD, dan soal. Bila ada yang kosong, AI diminta sekali lagi; bila masih kosong, guru mendapat pesan yang menyebut bagian yang kurang. `aiContentSchemas.ts` tidak dipakai karena memakai format lain dan menolak `[Kotak …]` di LKPD. |
| 5 | Hapus dari Riwayat kini mengisi `deleted_at`, dengan bilah Urungkan selama 10 detik. `UndoToast` aplikasi tidak bisa dipakai karena hanya mendukung entitas di `UndoManager`. |
| 6 | Belum dikerjakan: ekspor `.docx` dari server butuh `VITE_ENABLE_SERVER_DOCUMENT_EXPORT=true` di Vercel dan uji di preview deployment. |
| 7 | Overlay AI menampilkan waktu berjalan dan tombol Batalkan. Permintaan yang sudah terkirim tidak bisa dihentikan; hasilnya diabaikan dan tidak disimpan. |
| 8 | `useModulAjarGenerator` bebas `any` (18 menjadi 0). Riwayat dipindah ke `useModulAjarHistory`, cetak ke `utils/printDocument.ts` (kini memberi pesan bila pop-up diblokir), dan overlay ke `AiWaitingCard`. Lint turun dari 560 ke 546 warning. |
| 9 | `e2e/functional/modul-ajar.spec.ts` (3 tes, lulus di Chromium): versi Riwayat, membuka dokumen, Lembar Siswa, menyimpan edit, serta hapus dan urungkan. |

Temuan samping: E2E fungsional lain tertutup dialog "Apa yang baru". `jurnal.spec.ts` sudah diberi penanda rilis terakhir, dan hasilnya naik dari 1/6 ke 3/6. Tiga sisanya gagal karena teks halaman Jurnal sudah berubah. `attendance*.spec.ts` dan `back-navigation.spec.ts` kemungkinan butuh penanda yang sama.

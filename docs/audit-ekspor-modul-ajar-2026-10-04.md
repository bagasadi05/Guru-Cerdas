# Audit dan Rencana Perbaikan Ekspor Modul Ajar

Tanggal: 4 Oktober 2026. Basis kode: `43573ad9`.

## Hasil audit sebelum perbaikan

Unduhan lokal sudah menghasilkan berkas, tetapi kualitas ekspor belum memenuhi kriteria siap cetak. PDF browser memotong isi berdasarkan tinggi gambar. Word `.doc` menghasilkan puluhan halaman berisi sedikit teks. PDF server dan DOCX native memberi dasar yang lebih baik, tetapi DOCX kehilangan ruang jawaban dan pemilihan konten siswa belum aman untuk semua bentuk dokumen.

Laporan ini melanjutkan audit Claude yang terhenti karena batas sesi. Tahap pertama mengikuti pilihan pengguna: **audit dan rencana perbaikan**. Pengguna kemudian meminta implementasi; status perbaikannya dicatat di bagian terakhir.

## Bukti pemeriksaan

Sampel: Modul Ajar IPAS kelas 5, “Siklus Air dan Pengaruhnya bagi Kehidupan”, A4, versi guru dan siswa. Artefak dan skrip reproduksi Claude berada di `.cache/export-check/`; direktori ini diabaikan Git. Simpan artefak tersebut jika ingin membandingkan hasil implementasi berikutnya.

| Jalur | Guru | Siswa | Hasil pemeriksaan |
| --- | ---: | ---: | --- |
| PDF browser | 6 halaman | 2 halaman | Seluruh halaman berupa gambar; teks tidak dapat diekstrak. Sampul dan LKPD bersambung; batas halaman membelah isi. |
| Word HTML `.doc`, dibuka di Word 16 | 65 halaman | 28 halaman | Paragraf lampiran berulang kali memulai halaman baru. Hasil konversi Word mempunyai 15/11 halaman hampir kosong. |
| PDF server, Chromium lokal | 9 halaman | 3 halaman | Teks dapat diekstrak, sampul dan lembar terpisah, ruang jawaban tersedia. Masih memerlukan pengujian variasi dokumen dan lingkungan Vercel. |
| DOCX server, dibuka di Word 16 | 7 halaman | 3 halaman | Dapat dibuka; kotak jawaban menjadi setinggi satu baris. Garis jawaban berulang tampak menyatu dan sejumlah tabel tanpa bingkai mendapat garis. |

Jumlah halaman dan teks di atas dihitung ulang dari artefak pada sesi ini. Tampilan guru dan siswa diperiksa dari render halaman, termasuk pembesaran batas halaman PDF browser dan LKPD DOCX. “Hampir kosong” berarti kurang dari 15 karakter hasil ekstraksi dan tidak memiliki gambar; angka ini merupakan indikator tambahan, bukan pengganti pemeriksaan visual.

Log Claude mencatat unduhan melalui Playwright pada aplikasi lokal dengan sesi dan database tiruan. PDF/DOCX server dibuat dengan memanggil renderer langsung. **Ini belum membuktikan endpoint HTTP, autentikasi, cold start, atau deployment produksi berfungsi.** ID fixture Claude bukan UUID valid untuk endpoint; pengujian API berikutnya harus memakai UUID valid dan dokumen uji milik akun penguji.

## Temuan dan akar masalah

### P1 — Word HTML memecah lampiran menjadi puluhan halaman

Template menempatkan `page-break-before: always` pada wadah lampiran dan evaluasi. Ketika Word mengimpor HTML, banyak paragraf turunannya mendapat `PageBreakBefore = -1`. Pembersih HTML hanya menghapus `page-break-inside: avoid` dari `div` sehingga masalah ini tetap terjadi.

Uji langsung melalui Word COM: dokumen guru tetap 65 halaman setelah atribut `data-sheet` dihapus. Menonaktifkan `PageBreakBefore` pada seluruh paragraf dokumen yang dibuka sementara menurunkan jumlah halaman **65 menjadi 7**. Dokumen ditutup tanpa disimpan. Eksperimen ini membuktikan penyebab pagination, tetapi bukan perbaikan akhir karena batas sampul dan lembar tetap harus dipertahankan.

### P1 — PDF browser memotong teks dan mengabaikan batas bagian

`utils/pdfExport.ts` merender satu kanvas panjang lalu membaginya dengan `sourcePageHeight` tetap. Pemotongan tidak mengikuti baris teks, tabel, atau CSS pemisah halaman. Pada sampel, judul terpisah dari isinya dan baris di batas halaman terpotong. Memperbesar margin tidak menyelesaikan mekanisme ini.

### P1 — Varian siswa dapat memuat kunci jawaban guru

Mapper server mengenali LKPD/evaluasi hanya dari `border: 2px dashed`; parser tidak mempertahankan `data-sheet`. Jika kurang dari dua bingkai ditemukan, `buildStudentBody` mengembalikan seluruh dokumen guru.

Uji diagnostik mengganti bingkai menjadi `1px solid` sambil mempertahankan kedua penanda `data-sheet`. Ekspor `variant: siswa` kemudian memuat “KUNCI JAWABAN & PEDOMAN PENSKORAN” dan “Kegiatan Guru”. Kasus ini perlu ditolak dengan jelas atau diekstrak secara benar, sebelum ekspor server diaktifkan.

### P2 — DOCX kehilangan ruang jawaban dan sebagian aturan bingkai

Di `docxBuilder`, `height`/`min-height` hanya menentukan apakah paragraf kosong perlu dibuat; nilainya tidak dipakai untuk mengatur ukuran blok. Kotak `min-height: 60px` menjadi satu baris. Garis jawaban 22/24px juga tidak dipertahankan sebagai ruang tulis terpisah. Tabel identitas/tanda tangan tanpa bingkai terlihat memiliki garis pada hasil Word; nilai border tingkat tabel dan sel perlu diuji terhadap render Word, bukan hanya keberadaan XML.

### P2 — Daftar pustaka hilang dari varian siswa

Template menaruh daftar pustaka sebagai `div > ul > li`. Mapper mencari anak langsung `li` pada pembungkus `div`, sehingga tidak mengambil daftar tersebut. Uji diagnostik memastikan referensi buku ada pada versi guru dan tidak ada pada versi siswa. Ekstraksi di browser juga perlu disamakan dengan mapper server agar pratinjau dan unduhan konsisten.

### P2 — Geometri F4 dan margin berbeda antarjalur

Kode lama memakai F4 `612 × 936 pt` (sekitar `215,9 × 330,2 mm`), sedangkan model server menetapkan `215 × 330 mm`. Margin PDF browser adalah `28 pt`, server `20 mm`, dan cetak browser `14/15 mm`. Perbedaan ini ditemukan dari kode; sampel F4 belum dirender dalam audit ini.

## Rencana implementasi

### 1. Amankan pemilihan konten dan buat model dokumen konsisten

- Tambahkan properti internal `sheet?: 'lkpd' | 'evaluasi'` pada `ExportElement`. Parser hanya menerima dua nilai `data-sheet` tersebut. Utamakan penanda eksplisit; untuk dokumen lama gunakan pengenalan bingkai terluar dan judul lembar.
- Jika salah satu lembar tidak dapat diidentifikasi secara unik, gagalkan ekspor siswa dengan kode `INVALID_STUDENT_DOCUMENT` dan pesan Indonesia. Jangan mengembalikan dokumen guru. Petakan kode itu menjadi kategori klien `INVALID` yang sudah ada.
- Ambil daftar pustaka dari daftar langsung maupun daftar di dalam pembungkus bagian. Gunakan ekstraksi bersama untuk pratinjau siswa dan ekspor agar isi keduanya sama.
- Kontrak `POST /api/document-export/{pdf,docx}` tetap menerima `lessonPlanId`, `paperSize`, dan `variant`. Tidak diperlukan migrasi database.

### 2. Perbaiki render DOCX dan jembatan Word lama

- Representasikan kotak jawaban sebagai tabel satu sel dengan tinggi baris minimum, padding dan border yang mengikuti sumber. Gunakan tinggi minimum, bukan tinggi tetap yang dapat memotong teks hasil edit guru.
- Representasikan setiap garis jawaban sebagai baris/blok terpisah dengan tinggi 22/24px yang dikonversi ke twip; pastikan Word tidak menyatukan border antarparagraf. Terapkan border tabel secara eksplisit, termasuk `none` untuk identitas dan tanda tangan.
- Selama flag server masih mati, perbaiki `.doc` dengan normalisasi DOM: hapus pemisah halaman dari wadah dan pindahkan ke paragraf awal/akhir bagian yang tepat. Pertahankan batas sampul, lampiran, dan evaluasi; hindari regex lintas elemen bersarang.
- Gunakan konstanta ukuran kertas bersama: A4 210 × 297 mm, F4 215 × 330 mm, margin 20 mm. Pertahankan isi dan identitas dokumen tersimpan sebagai sumber ekspor.

### 3. Gunakan jalur PDF server sesuai PRD yang sudah ada

- Pertahankan renderer Chromium dan builder DOCX yang telah tersedia; rapikan aturan pagination pada bagian panjang dan periksa batas teks/tabel. Jangan menambah solusi potongan kanvas untuk PDF resmi.
- Aktifkan `VITE_ENABLE_SERVER_DOCUMENT_EXPORT=true` terlebih dahulu pada build preview setelah perbaikan dan pengujian lulus. Flag Vite dibaca saat build sehingga perlu deployment baru.
- Uji unduhan dari pratinjau, layar penuh, dan riwayat melalui endpoint nyata. Pastikan perubahan guru tersimpan sebelum server mengambil dokumen. Saat server gagal, tampilkan galat, coba lagi, serta pilihan Cetak untuk PDF; jangan diam-diam mengunduh versi lama.
- Promosi produksi mengikuti rollout pada PRD: pengguna internal, pemantauan galat/durasi, lalu perluasan. Hapus jalur raster dan `.doc` setelah server stabil. Konfigurasi Vercel dan push/deploy belum termasuk pekerjaan audit ini.

### 4. Verifikasi yang menentukan kelulusan

- Matriks A4/F4 × guru/siswa × PDF/DOCX; gunakan Modul Ajar, RPP, KBC, dokumen panjang, tabel lintas halaman, dan teks hasil edit pratinjau. Sertakan dokumen lama tanpa penanda serta dokumen yang bingkainya diubah.
- PDF: semua teks sumber tercakup dalam urutan yang benar, dapat dicari, tidak terpotong atau keluar margin; judul mengikuti isi; tidak ada halaman kosong tak disengaja. Sampul, LKPD dan evaluasi dimulai pada batas yang dimaksud.
- Word: buka DOCX di Microsoft Word dan LibreOffice; bandingkan PDF hasil render. Kotak jawaban minimal setinggi sumber, garis tulis terpisah, tabel dan tanda tangan terbaca, serta tidak ada pembengkakan halaman per paragraf. Jumlah halaman PDF dan Word tidak harus identik.
- Siswa: LKPD, evaluasi dan daftar pustaka tersedia; kunci jawaban dan instruksi khusus guru tidak boleh lolos. Kasus ekstraksi ambigu menghasilkan pesan gagal.
- API/E2E: token hilang/kedaluwarsa, dokumen pengguna lain, dokumen dihapus, kegagalan menyimpan edit, timeout, rate limit, klik ganda, nama/ekstensi/MIME, dan F4 riwayat. Gunakan UUID valid.
- Jalankan TypeScript, lint, tes unit/integrasi, build, serta inspeksi visual artefak baru. Tes struktur yang lulus saja tidak cukup menyatakan hasil ekspor layak.

## Status verifikasi sesi audit

- TypeScript: lulus (`npx tsc --noEmit`).
- ESLint: 0 error, 546 warning; hasil JSON berada di `.cache/export-audit-eslint.json`.
- Dua uji diagnostik: lulus dan membuktikan perilaku salah yang dilaporkan, bukan membuktikan perbaikannya. Skrip sementara: `.cache/export-check/audit-probes.test.ts`.
- Tes penuh: 198 berkas tes, 2.539 tes lulus. Dijalankan dengan nilai Supabase tiruan untuk inisialisasi klien; log berada di `.cache/export-audit-tests.log`.
- Build produksi: lulus, termasuk service worker PWA (`npm run build`). Log berada di `.cache/export-audit-build.log`.
- Pemeriksaan keamanan terbatas: endpoint memvalidasi ID/varian, memakai token pengguna, memeriksa kepemilikan, dan mengecualikan dokumen dihapus; renderer memblokir permintaan jaringan eksternal. Pemindaian pola rahasia pada source tidak menemukan kecocokan dan file `.env` tidak dilacak Git. RLS produksi tidak diaudit ulang.
- Nilai flag server tidak ditemukan di `.env` lokal; default kode adalah mati. Konfigurasi Vercel belum diverifikasi.
- Pengguna memilih Antislop selama pengerjaan. Direktori `.agents/skills/antislop` tidak tersedia dalam workspace dan pencarian lokasi skill alternatif tidak menemukan berkasnya. Audit memakai bahasa langsung dan aturan proyek; kepatuhan pada skill Antislop yang tidak tersedia belum dapat diklaim.

Referensi: [PRD ekspor dokumen](./prd-modul-ajar-ekspor-dokumen.md), [implementasi ekspor server](./modul-ajar-ekspor-dokumen.md), dan [audit Modul Ajar sebelumnya](./audit-modul-ajar-2026-10-04.md).

## Implementasi perbaikan

Permintaan lanjutan pengguna: memperbaiki temuan audit. Perubahan diterapkan pada kode lokal, tanpa push/deploy atau perubahan konfigurasi Vercel.

- Jalur Word HTML `.doc` dihapus dan diganti DOCX native, termasuk saat flag server mati. Kedua jalur memakai builder bersama, sehingga masalah pewarisan page-break pada importer HTML Word dihindari.
- PDF browser tidak lagi memotong kanvas. Tombol membuka dialog cetak native dan memberi petunjuk Simpan sebagai PDF. Ini perubahan alur yang disengaja: unduhan otomatis tetap tersedia melalui PDF server ketika flag server aktif.
- Geometri cetak lokal, PDF server dan DOCX mengikuti konstanta A4/F4 dan margin 20 mm.
- Kotak dan garis jawaban memakai baris native dengan tinggi minimum, sehingga teks panjang tetap dapat memperbesar ruang. Border tabel tanpa bingkai ditetapkan eksplisit; logo PNG mempertahankan rasio gambar dan label singkat mengikuti isinya.
- Parser mempertahankan penanda LKPD/evaluasi. Pratinjau siswa dan server memakai ekstraksi bersama; referensi dalam pembungkus bagian disertakan. Lembar hilang, duplikat, atau bersarang ditolak tanpa mengembalikan konten guru.
- Galat siswa memakai `INVALID_STUDENT_DOCUMENT`/422 dan kategori klien `INVALID`. Tombol siswa menampilkan pesan saat ekstraksi gagal. Unduhan Word menampilkan status proses dan mencegah klik ganda.

Sampel baru berada di `.cache/export-check/fixed/`. Pengujian renderer A4/F4 dan pembukaan Word: dokumen guru 7 halaman, siswa 3 halaman; ruang jawaban dan daftar pustaka tersedia, kunci jawaban tidak ada di varian siswa. Kriteria tersebut sudah diperiksa pada render Word, bukan hanya XML. Pengujian browser berhasil mengunduh DOCX guru/siswa dan membuka PDF native dari tombol aplikasi. DOCX unduhan browser juga dibuka di Word: 7/3 halaman. PDF browser kini 9/3 halaman dengan teks yang dapat diekstrak; sampul, LKPD, evaluasi dan referensi diperiksa pada hasil render. PDF server A4 9/3 halaman, F4 7/3 halaman.

Quality gate: TypeScript lulus; lint 0 error dan 546 warning; suite penuh 198 berkas/2.537 tes lulus. Setelah penambahan regresi pemisah halaman `br` lama dan kotak jawaban berisi paragraf hasil edit, 38 tes terarah lulus pada kode akhir. Jumlah tes berkurang dari baseline karena tes kanvas dan pembersih Word HTML yang sudah dihapus diganti dengan tes mekanisme native. Build akhir lulus, termasuk service worker PWA. Log ada di `.cache/export-fix-*.log`.

Pemindaian pola rahasia pada berkas yang diubah tidak menemukan kecocokan. `graphify` tidak tersedia pada PATH sehingga pembaruan graph belum dijalankan.

Batas verifikasi: deployment Vercel dan LibreOffice belum diuji. Audit mencakup sampel yang direproduksi, bukan jaminan seluruh kemungkinan HTML hasil edit mempunyai pagination identik antarprogram.

## Perbaikan tata letak berdasarkan berkas pengguna

Berkas Bahasa Indonesia Kelas 3 yang dikirim pengguna diperiksa langsung: PDF asli 11 halaman; DOCX asli dirender dengan Microsoft Word menjadi 8 halaman. Temuan: halaman diferensiasi dan tanda tangan yang terlalu kosong pada PDF, tabel pendek/paragraf asesmen terpecah di Word, opsi pilihan ganda menyatu dalam soal, serta penanda tabel/kotak LKPD belum menjadi ruang kerja nyata.

Normalisasi layout bersama kini berlaku pada kedua renderer dan modul tersimpan. Opsi dipecah, LKPD mendapat ruang gambar serta tabel jawaban kosong, blok asesmen pendek dijaga bersama labelnya, tabel pendek di Word diikat antarbaris, bingkai lembar kerja dibuat native, dan referensi guru dipisahkan. Spasi diperbaiki dengan mempertahankan ukuran font serta tinggi jawaban eksplisit.

Reproduksi menggunakan HTML `.doc` lama untuk modul yang sama, dengan identitas sesuai berkas pengguna. Perbandingan token PDF memastikan tidak ada kata isi pelajaran hilang; penggantian terbatas pada penanda tabel dan label jawaban pilihan ganda. Sampel A4 akhir: PDF 8 halaman, DOCX 8 halaman setelah render Word. F4: PDF/DOCX 8 halaman; varian siswa A4/F4 3 halaman tanpa kunci jawaban. Sampel dan render visual berada di `.cache/export-check/user-fixed/`.

Verifikasi: TypeScript lulus; ESLint 0 error dengan 546 warning yang sudah ada; 199 berkas/2.544 tes lulus. Tes browser membuka PDF native dan mengunduh DOCX guru/siswa melalui tombol aplikasi. Log berada di `.cache/export-layout-*.log`; build produksi diperiksa kembali. Berkas hasil perbaikan disediakan sebagai salinan terpisah, berkas asli tidak diubah. Perubahan kode masih lokal.

# Ekspor Dokumen Modul Ajar (PDF Server & Word .docx)

Implementasi fase pertama dari [PRD Ekspor Dokumen Modul Ajar](./prd-modul-ajar-ekspor-dokumen.md). Fitur berjalan di balik feature flag `VITE_ENABLE_SERVER_DOCUMENT_EXPORT`. Selama flag mati, Word dibuat sebagai DOCX native di browser; PDF membuka dialog cetak native dengan petunjuk memilih **Simpan sebagai PDF**. Kedua jalur memakai model dan geometri dokumen bersama.

## Tata letak dokumen tersimpan

`documentLayout.ts` menyiapkan salinan pohon dokumen sebelum render PDF atau DOCX. HTML yang tersimpan tidak diubah. Perbaikan juga berlaku untuk modul lama yang belum memiliki penanda `data-sheet`, melalui pengenalan judul dan bingkai LKPD/evaluasi.

- Opsi A–D yang menyatu dalam paragraf soal dipisahkan menjadi baris tersendiri. Ruang jawaban uraian tetap tersedia; soal pilihan ganda memakai bidang jawaban pendek.
- Label, langkah kerja, dan penanda ruang jawaban LKPD dipisahkan. Permintaan gambar mendapat ruang minimum 120 px; permintaan tabel menjadi lima baris kosong dengan tinggi minimum 32 px per baris.
- Font sumber dipertahankan. Spasi badan dokumen dirapikan, tabel pendek dan label asesmen dijaga bersama isi, serta bingkai panjang bagian utama yang terfragmentasi dihilangkan.
- Lembar kerja mempertahankan bingkai serta padding dalam DOCX native. Kunci jawaban guru dimulai pada halaman referensi tersendiri.
- Ukuran ruang jawaban eksplisit dan page break pengguna di luar pembungkus lampiran bawaan tetap dipertahankan. Dokumen sangat panjang masih dapat melintasi halaman.

## Alur

1. Guru menekan **PDF** atau **Word** di pratinjau, layar penuh, atau kartu riwayat.
2. Jika ada perubahan di pratinjau yang belum disimpan, aplikasi menawarkan **Simpan & Unduh**. Perubahan disimpan ke `lesson_plans.generated_content` sebelum ekspor. Jika guru menutup dialog, tidak ada yang diunduh dan tidak ada data yang disimpan.
3. Klien mengirim `POST /api/document-export/{pdf|docx}` berisi `lessonPlanId`, `paperSize`, dan `variant` (`guru` atau `siswa`). HTML tidak ikut dikirim.
4. Server memverifikasi sesi Supabase, membaca baris `lesson_plans` memakai token pengguna (RLS tetap berlaku), lalu memastikan `user_id` sama dengan pengguna yang masuk.
5. Data dipetakan ke `LessonPlanExportData`, model yang sama untuk PDF dan Word.
6. Berkas dikirim langsung sebagai lampiran. Server tidak menyimpan berkas apa pun.

## Struktur Kode

| Lokasi | Isi |
| --- | --- |
| `src/lib/modulAjarExport/types.ts` | Tipe `LessonPlanExportData`, ukuran kertas A4/F4, margin 2 cm |
| `src/lib/modulAjarExport/documentTree.ts` | Parser HTML tersimpan (parse5) menjadi pohon dokumen ber-allowlist: tag aktif dibuang, gaya CSS disaring, gambar hanya `data:image` |
| `src/lib/modulAjarExport/lessonPlanMapper.ts` | Mapper baris `lesson_plans`, pemilihan ukuran kertas, dan pembentukan versi LKPD siswa |
| `src/lib/modulAjarExport/printTemplate.ts` | Template HTML cetak dengan `@page`, header tabel berulang, baris tabel dan tanda tangan tidak terbelah |
| `src/lib/modulAjarExport/docxBuilder.ts` | Builder OOXML dengan paket `docx`: tabel (lebar kolom, gabungan sel, warna latar), daftar bernomor, gambar, page break, header, dan nomor halaman |
| `src/lib/modulAjarExport/fileName.ts` | Nama berkas `Modul_Ajar_{mapel}_Kelas{kelas}.{ext}` dan header `Content-Disposition` |
| `api/_documentExport.ts` | Pipeline bersama: autentikasi, rate limit, validasi body, cek kepemilikan, pemetaan kode galat, audit log |
| `api/_pdfRenderer.ts` | Chromium headless (`puppeteer-core` + `@sparticuz/chromium`), font Tinos tertanam, timeout 25 detik, maksimal 2 render bersamaan per instance |
| `api/document-export/pdf.ts`, `docx.ts` | Endpoint Vercel |
| `src/services/documentExportService.ts` | Klien: token sesi, timeout 45 detik, pesan galat per jenis |
| `components/ExportFailureBanner.tsx` | Pesan gagal dengan tombol **Coba lagi** dan **Cetak lewat browser** |

Folder `src/lib/modulAjarExport` dipakai oleh browser dan server sekaligus, jadi tidak boleh memakai `window`, `document`, atau `import.meta.env`.

## Kontrak API

```http
POST /api/document-export/pdf
Authorization: Bearer <access_token Supabase>
Content-Type: application/json

{ "lessonPlanId": "uuid", "paperSize": "A4", "variant": "guru" }
```

- `paperSize` opsional. Urutan prioritas: nilai permintaan, lalu `components.paperSize` tersimpan, lalu A4.
- `variant` opsional, default `guru`. Nilai `siswa` hanya memuat sampul, LKPD, evaluasi, dan daftar pustaka.
- Respons sukses: `application/pdf` atau `application/vnd.openxmlformats-officedocument.wordprocessingml.document` dengan `Content-Disposition: attachment`.

| Status | `code` | Arti |
| --- | --- | --- |
| 400/413 | `INVALID_REQUEST` | ID, ukuran kertas, atau varian tidak valid; body lebih dari 2 KB |
| 401 | `UNAUTHORIZED` | Token tidak ada atau kedaluwarsa (tanpa pengecualian untuk localhost) |
| 403 | `FORBIDDEN` | Dokumen milik pengguna lain |
| 404 | `NOT_FOUND` | Dokumen tidak ada, terhapus, atau disembunyikan RLS |
| 413/422 | `DOCUMENT_TOO_LARGE` / `EMPTY_DOCUMENT` | Isi dokumen melebihi 3 MB atau kosong |
| 429 | `RATE_LIMITED` | Lebih dari 10 PDF atau 20 Word per menit per pengguna |
| 503 | `RENDERER_BUSY` / `RENDERER_UNAVAILABLE` | Chromium sibuk atau gagal dijalankan |
| 504 | `TIMEOUT` | Render melebihi 25 detik |
| 500 | `RENDER_FAILED` | Galat tak terduga; detail hanya tercatat di log server |

Setiap permintaan menulis satu baris log JSON `event: document_export` (hasil, format, `userId`, `lessonPlanId`, durasi, ukuran berkas) untuk memantau tingkat kegagalan dan p95.

## Konfigurasi

| Variabel | Lokasi | Keterangan |
| --- | --- | --- |
| `VITE_ENABLE_SERVER_DOCUMENT_EXPORT` | Build klien | `true` untuk memakai endpoint baru |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Vercel (server) | Sudah dipakai `api/_auth.ts`; fallback ke `VITE_SUPABASE_*` |
| `CHROME_EXECUTABLE_PATH` | Lokal saja | Path Chrome untuk `vercel dev` di Windows/macOS |

`vercel.json` memberi fungsi PDF memori 1769 MB, durasi maksimal 60 detik, serta menyertakan biner Chromium dan font Tinos.

## Pengujian

- `tests/unit/modulAjarDocumentExport.test.ts`: sanitasi parser, mapper (A4/F4, varian siswa), template cetak, struktur `.docx` (ukuran halaman, header tabel berulang, baris tidak terbelah, daftar bernomor, gambar), nama berkas.
- `tests/unit/documentExportApi.test.ts`: metode, autentikasi, query memakai token pengguna, kepemilikan, 404, dokumen kosong, rate limit, pemetaan galat renderer.
- `tests/unit/documentExportService.test.ts`: isi permintaan klien, pemetaan status ke pesan, galat jaringan.

Render nyata dengan Chrome lokal pada sampel 10 halaman: A4 210 × 297 mm (10 halaman), F4 215 × 330 mm (9 halaman), LKPD siswa 4 halaman. Tidak ada halaman kosong maupun teks yang keluar dari margin, dan waktu render 0,7 sampai 1,7 detik per berkas.

## Aturan Tata Letak

Diterapkan pada PDF, `.docx`, dan sebagian pada pratinjau layar:

- Teks rata kiri-kanan di dalam sel tabel dicetak rata kiri, agar kolom sempit (Kegiatan Guru/Siswa, rubrik) tidak renggang. Berlaku di PDF, Word, pratinjau, dan jendela cetak.
- Tabel sampai 8 baris tidak terbelah antarhalaman (rubrik, lembar refleksi, blok identitas). Tabel lebih panjang tetap terbelah dan header-nya berulang.
- Judul bagian berlatar (`D. PENDEKATAN & MODEL PEMBELAJARAN`) selalu ikut pindah bersama isi di bawahnya (`break-after: avoid` di PDF, `keepNext` di Word).
- Template dokumen (`utils/template.ts`) memulihkan struktur yang ditulis AI dalam satu baris: opsi pilihan ganda `A. … B. …`, label LKPD (`Petunjuk:`, `Langkah Kerja: 1. … 2. …`), kotak jawaban `[…]`, dan butir Kompetensi Awal. Perbaikan ini berlaku untuk dokumen yang disusun setelah perubahan; dokumen lama di riwayat tetap memakai HTML tersimpan.

## Belum Tercakup

- Sampel A4/F4 guru dan siswa sudah dibuka serta dirender melalui Microsoft Word 16. LibreOffice dan cold start produksi belum diuji.
- p95 waktu render di Vercel (cold start Chromium) perlu diukur di preview deployment.
- Rate limit dan batas render bersamaan berlaku per instance. Untuk batas global, pakai Upstash seperti `api/groq.ts`.
- Isi dokumen hanya tersimpan sebagai HTML, sehingga model ekspor dibentuk dari HTML tersimpan. Menyimpan data terstruktur di `components` akan menjadi langkah berikutnya bila diperlukan.
- Ekspor Modul Ajar tidak lagi memakai potongan kanvas atau HTML berakhiran `.doc`. Cadangan lokal menggunakan dialog PDF browser dan DOCX native. Dependensi `html2canvas`/jsPDF masih digunakan fitur lain.

## Rollout

1. Deploy ke preview Vercel dengan `VITE_ENABLE_SERVER_DOCUMENT_EXPORT=true`.
2. Uji sampel A4/F4: Modul Ajar, RPP, KBC, tabel panjang, LKPD siswa. Buka `.docx` di Word dan LibreOffice.
3. Aktifkan untuk pengguna internal, pantau log `document_export` selama 7 hari.
4. Aktifkan PDF server untuk semua guru setelah pengujian preview dan pemantauan selesai. Jalur lokal tetap tersedia selama flag dimatikan.

## Perbaikan hasil ekspor (4 Oktober 2026)

- Word lokal dan server menghasilkan `.docx` asli melalui builder yang sama. Tinggi kotak jawaban dan garis tulis dipertahankan sebagai baris dengan tinggi minimum; tabel tanpa bingkai dinyatakan tanpa border.
- PDF lokal menggunakan pagination native browser, bukan potongan gambar. Pengguna memilih Simpan sebagai PDF pada dialog cetak. PDF server tetap menghasilkan unduhan langsung.
- Semua jalur memakai A4 210 × 297 mm / F4 215 × 330 mm dengan margin 20 mm.
- `data-sheet` dipertahankan dalam model ekspor. Varian siswa memakai ekstraksi yang sama dengan pratinjau, menyertakan daftar pustaka, serta menolak lembar hilang/ambigu dengan `INVALID_STUDENT_DOCUMENT` (HTTP 422). Dokumen guru tidak digunakan sebagai fallback siswa.
- Tombol Word menampilkan status proses dan mencegah unduhan bersamaan. PDF yang membuka dialog tidak lagi menampilkan klaim unduhan sukses.

Bukti dan keterbatasan: [audit ekspor](./audit-ekspor-modul-ajar-2026-10-04.md).

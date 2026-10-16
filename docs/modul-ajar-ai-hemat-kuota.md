# AI Modul Ajar: penghematan kuota

## Alur yang digunakan

Menu Modul Ajar memanggil generator di browser → router Gemini/Groq → proxy `/api/gemini` atau `/api/groq`. Jalur ini memakai `useModulAjarAiJob`, bukan antrean Edge Worker pada laporan Juli 2026. Key produksi tetap disimpan di server. Pengembangan lokal boleh memakai key dev atau proxy yang dikonfigurasi.

**Susun dokumen** mencari cache privat terlebih dahulu. **Buat versi AI baru** melewati cache dan artefak lama; isian guru tetap dipertahankan. Per bidang, tindakan utama memakai cache dan **Versi baru** meminta hasil baru. CP dan referensi diambil dari sumber terverifikasi/input guru tanpa panggilan AI.

Hanya komponen yang belum tersedia diminta dari model. LKPD disimpan sebagai struktur aktivitas dan ID tujuan; asesmen menyimpan lima soal, pilihan, kunci, pembahasan, rubrik, serta ID tujuan. Komponen lain yang sudah valid dapat dirakit kembali. Teks guru tidak ditimpa. Reviewer memeriksa isi akhir termasuk teks guru yang menggantikan tampilan komponen terstruktur dan tambahan materi insersi KBC pada tujuan yang dicetak.

Validasi Zod dan pemeriksaan kode berjalan sebelum peninjauan isi. Temuan menunjuk komponen, nomor soal, atau pertemuan. Patch hanya menerima target tersebut dan melindungi konten guru. Maksimal satu putaran perbaikan untuk setiap proses, termasuk asesmen per bidang; setelah penggabungan, seluruh hasil divalidasi dan diperiksa kembali. JSON terpotong, hasil kosong, reviewer tidak lengkap, atau masalah yang tidak dapat ditargetkan ditolak tanpa mengulang seluruh dokumen.

## Cache dan pemakaian

- `modul_ajar_ai_cache`: pemilik `auth.uid()`, operasi, fingerprint SHA-256, versi prompt/kontrak, konten, dan kedaluwarsa 7 hari. Unik per pemilik/operasi/fingerprint. Cache lama, kedaluwarsa, atau tidak valid menjadi cache miss.
- Fingerprint memasukkan konteks lengkap: mapel, topik, fase/kelas, CP dan asalnya, tujuan guru, model/sintaks/metode, waktu/pertemuan, profil, KBC, referensi, dan konten guru. Tanda baca dan urutan array dipertahankan. Artefak keluaran tidak menjadi input guru baru setelah pemulihan draft.
- Hanya hasil yang lolos pemeriksaan wajib disimpan. Kegagalan cache memberi pesan singkat dan tetap membolehkan hasil digunakan. Operasi penyimpanan dibatasi 3,5 detik.
- Permintaan identik yang bersamaan dalam sesi yang sama berbagi satu proses. Pembatalan satu pemakai tidak membatalkan pemakai lain; proses dibatalkan saat seluruh pemakai berhenti.
- `modul_ajar_ai_usage`: operasi, cache hit, status, setiap percobaan/provider/model aktual, waktu, dan token. Tidak menyimpan prompt, key, atau data siswa. Catatan bersifat diagnostik dari klien, bukan bukti tagihan.
- Total memakai angka provider; token reasoning tidak ditambahkan lagi ke total. Angka yang tidak diketahui tetap `null`, bukan nol. Cache hit berarti nol panggilan/token baru. Gemini melaporkan kandidat dan reasoning terpisah; reasoning Groq termasuk dalam completion.
- Cron `cleanup-modul-ajar-ai` berjalan pukul 19.00 UTC/02.00 WIB, menghapus cache kedaluwarsa dan catatan pemakaian lebih dari 30 hari. Dokumen tersimpan tidak dihapus.

## Provider dan batas output

Utama: Gemini sesuai `VITE_GEMINI_MODEL`, default `gemini-2.5-flash`. Fallback khusus Modul Ajar: Groq `openai/gpt-oss-20b`, hanya jika tersedia. Model untuk fitur lain tidak berubah.

| Jenis permintaan | Maksimum output Gemini | Thinking Gemini 2.5 Flash | Maksimum completion Groq |
| --- | ---: | ---: | ---: |
| Bidang pendek | 2.048 | 0 | 2.048 |
| Materi/LKPD | 6.144 | 0 | 6.144 |
| Asesmen | 8.192 | 1.024 | 6.144 |
| Peninjauan | 4.096 | 1.024 | 2.048 |
| Dokumen | 16.384 + 2.048 × (pertemuan − 1), maksimal 32.768 | 1.024 | 6.144 |

Ini batas keluaran, bukan pemakaian per input. Input prompt, output, dan reasoning tetap memakai kuota. Patch memakai profil komponen yang diperbaiki. Gemini 3 memakai `thinkingLevel` yang kompatibel; nilai minimal bukan jaminan nol thinking. GPT-OSS memakai JSON mode dan reasoning `low`, tanpa mengembalikan teks reasoning. Kontrak yang terlalu panjang untuk batas Groq dapat gagal karena terpotong; sistem menolak hasil tersebut.

Proxy memvalidasi profil/pertemuan dan menetapkan ulang batas serta reasoning dari whitelist. Modul Ajar membatasi Gemini maksimal dua percobaan dan fallback Groq satu percobaan per panggilan logis. `Retry-After`/`retryDelay` dipatuhi penuh; bila pembatasan per menit tidak memberi petunjuk, tunggu minimal 60 detik. Kuota harian, input terlalu besar, dan konfigurasi key tidak diulang otomatis. Key server yang sedang cooldown tidak dipakai lagi sebelum waktunya. Pembatalan diteruskan ke antrean lokal, fetch, waktu tunggu, tahap generator, dan penyimpanan dokumen.

Rujukan parameter: [Gemini thinking](https://ai.google.dev/gemini-api/docs/generate-content/thinking), [Groq API](https://console.groq.com/docs/api-reference), [GPT-OSS 20B](https://console.groq.com/docs/model/openai/gpt-oss-20b).

## Migrasi dan pemeriksaan

Migrasi `20261005120000_modul_ajar_private_ai_cache.sql` menambahkan dua tabel privat, policy pemilik, index, fungsi pembersihan khusus server, serta cron. Sudah diterapkan dan tercatat pada Supabase workspace tanggal 5 Oktober 2026.

```powershell
node scripts/modul-ajar-ai-database.mjs preflight
node scripts/modul-ajar-ai-database.mjs apply
node scripts/modul-ajar-ai-database.mjs verify
```

Script memakai `SUPABASE_PROJECT_REF`/`SUPABASE_ACCESS_TOKEN`, memeriksa kecocokan URL workspace, dan menerapkan hanya migrasi ini. Preflight memastikan tabel belum ada, cron tersedia, dan dua pengguna tersedia untuk verifikasi. Verifikasi nyata membuktikan RLS aktif (4 policy cache, 2 policy usage), cron aktif, serta penolakan baca/tulis lintas dua pemilik. Akses anonim, perubahan catatan usage oleh klien, dan pemanggilan cleanup oleh klien ditolak. Probe pembersihan membuktikan cache kedaluwarsa serta usage lebih dari 30 hari dihapus dan catatan baru dipertahankan. Semua probe diuji dalam transaksi dan dibatalkan dengan rollback.

Pengujian otomatis mencakup cache privat setelah reload, fingerprint, kedaluwarsa/kontrak rusak, force refresh, deduplikasi, konteks guru, provenance draft, artefak per bidang, patch terarah, pembatalan, token yang tidak diketahui, batas output, kuota, dan metadata provider. Pengujian browser memakai Supabase dan respons provider simulasi, termasuk dua panggilan awal, nol panggilan setelah reload, dan versi baru eksplisit.

Hasil pemeriksaan 5 Oktober 2026: 204 file/2.599 tes lolos; lima pengujian browser Chromium lolos. Pemeriksaan browser mencakup lebar 320, 390, dan 1.440 piksel, mode terang/gelap, serta fokus keyboard. TypeScript lolos, lint tanpa error, dan build frontend lolos. Build masih melaporkan tiga peringatan pemisahan chunk yang sudah ada. Setelah penyesuaian tata letak tombol pada layar kecil, 16 tes UI terkait dijalankan kembali dan lolos.

Panggilan model nyata belum diverifikasi: environment lokal memiliki akses admin Supabase, tetapi key Gemini/Groq atau proxy AI yang dapat diuji belum tersedia. Migrasi database sudah aktif; frontend/proxy baru belum dideploy. Audit dengan skill Anti-Slop mode After tidak dapat dijalankan karena file skill tidak tersedia di workspace; pemeriksaan responsif, dark mode, dan keyboard dilakukan melalui browser.

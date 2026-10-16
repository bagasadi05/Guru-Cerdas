# Alur pengisian absensi guru

## Pengisian tanggal aktif

1. Buka **Absensi**, pilih kelas dan tanggal.
2. Tandai status tiap siswa. **Semua Hadir**, **Semua Libur**, dan **Tandai Sisa Hadir** hanya mengubah isian.
3. Tambahkan catatan melalui **Terapkan catatan**, jika perlu.
4. Tekan **Simpan Sekarang** atau **Simpan Offline**. Jika ada siswa yang belum ditandai, periksa konfirmasi sebelum menandainya Hadir.

Tulisan **Perubahan belum disimpan** menandakan isian masih berupa draf. Menerapkan catatan belum menyimpannya ke server.

## Pindah kelas, tanggal, atau semester

Jika ada draf, sistem menawarkan:

- **Tetap mengisi**: mempertahankan isian dan konteks saat ini.
- **Buang perubahan & pindah**: membuka tujuan tanpa menyimpan draf.
- **Simpan & pindah**: menyimpan konteks lama dahulu, lalu membuka tujuan.

Perpindahan setelah simpan hanya dilakukan ketika server menerima penyimpanan atau transaksi IndexedDB antrean offline selesai. Absensi tidak menggunakan penyimpanan sementara di memori sebagai keberhasilan simpan offline. Membatalkan konfirmasi siswa yang belum ditandai, kegagalan server, atau kegagalan antrean tidak memindahkan kelas/tanggal dan tidak menghapus draf. Simpan offline berarti menunggu sinkronisasi; belum berarti tersimpan di server.

## Hari terlewat

Pengingat hari terlewat dilipat saat halaman dibuka. Guru dapat membukanya untuk melihat tanggal.

**Isi hari terlewat** adalah tindakan terpisah yang langsung menyimpan. Dialog menampilkan kelas dan rentang tanggal dari Senin sampai hari terlewat terakhir. Hanya siswa yang belum tercatat pada rentang tersebut yang diisi Hadir; status yang sudah tersimpan dipertahankan. Periksa dahulu siswa yang seharusnya Sakit, Izin, atau Alpha.

Rentang selalu berakhir sebelum hari ini dan sebelum tanggal absensi yang sedang dibuka. Tindakan ini tidak menyimpan draf tanggal aktif. Saat membuka tanggal lama, pengingat hanya menawarkan hari yang lebih awal daripada tanggal tersebut.

## Tampilan HP dan akses keyboard

- Nama siswa panjang ditampilkan utuh. Catatan dan WhatsApp menggunakan baris terpisah di kartu HP.
- Label status dan tombol Simpan tidak dipotong. Tombol Simpan mengambang tersusun vertikal pada layar kecil dan berada di atas navigasi bawah.
- **Pilih semua** berada di sebelah judul **Daftar siswa**.
- Analisis AI dan ekspor dapat dibuka melalui **Pilihan lain absensi**.
- Dialog mendukung Tab, Shift+Tab, dan Escape. Menutup dialog perpindahan mempertahankan draf.

## Catatan implementasi

Pengaman konteks berada di `useAttendanceContextGuard`; hasil penyimpanan bertipe `saved`, `queued`, atau `failed`. Muatan dan kunci cache menggunakan kelas/tanggal saat simpan dimulai. Status draf dibersihkan hanya setelah penyimpanan berhasil. Permintaan simpan ganda ditolak selama proses masih berjalan.

Perubahan ini tidak memerlukan migrasi database. Aturan hari Minggu dan jadwal pengisian otomatis tetap menggunakan mekanisme yang sudah ada.

Pengujian menggunakan data sintetis dan respons Supabase yang dimock. Hasilnya tidak membuktikan penyimpanan atau sinkronisasi pada akun produksi.

## Hasil pemeriksaan — 10 Oktober 2026

- TypeScript dan build produksi: lolos. Build dijalankan melalui konfigurasi tes Playwright.
- Tes terarah Absensi dan antrean offline: **83/83 lolos**.
- Tes browser: **19/19 lolos**, termasuk layar 320, 390, dan 1440 px pada mode terang/gelap, keyboard, konfirmasi perpindahan, kegagalan server, penyimpanan IndexedDB, penyimpanan offline yang tidak tersedia, dan batas tanggal pengisian hari terlewat.
- Pemeriksaan visual: nama panjang utuh, label status terbaca, tanggal tidak terpotong, dan tombol Simpan berada di atas navigasi HP. Kartu siswa pertama muncul sekitar 777 px pada layar HP tinggi 900 px dengan 30 siswa, 12 kelas, dan lima hari terlewat.
- Lint pada berkas perubahan: **0 error, 36 warning**. Pemeriksaan proyek penuh masih menemukan satu error lama pada `VoiceGradeModal.tsx` (akses ref saat render) dan 531 warning.
- Tes seluruh proyek pada pemeriksaan terakhir: **2771 lolos, satu gagal**, di `smart-insights-panel.test.tsx` karena pencarian teks kelas cocok dengan lebih dari satu elemen. Setelah itu tes tambahan untuk pengelola koneksi saat offline dijalankan dalam kelompok 83 tes terarah di atas.

Bukti lokal tersimpan di `scratch/absensi-ux-2026-10-10/` dan `test-results/` (keduanya artefak pengujian). Pemeriksaan belum dilakukan pada database produksi; perubahan belum dideploy.

# Perbaikan Data Siswa

Tanggal: 6 Oktober 2026.

## Ruang Lingkup

Perbaikan delapan temuan audit menu Data Siswa setelah pembaruan dari GitHub.

| Temuan | Perubahan |
| --- | --- |
| Pilihan siswa tertinggal saat berpindah kelas atau memfilter | Pilihan dibatasi ke ID yang masih terlihat; pilihan yang hilang tidak muncul kembali saat kelas dibuka ulang. Pindah dan hapus massal menolak ID di luar daftar aktif. |
| Kelas lain bisa dihapus karena jumlah siswanya tidak dimuat | Jumlah siswa diperiksa langsung pada kelas tujuan, sebelum konfirmasi dan saat penghapusan. Pemeriksaan yang gagal membatalkan penghapusan. |
| Kolom identitas salah dipetakan saat impor | NIS, NISN, tanggal lahir, kode akses, nama kelas, nama orang tua, dan nomor telepon dipetakan terpisah. Tanggal dinormalisasi; tanggal tidak valid ditolak. |
| Nama kelas tidak dikenal masuk ke kelas aktif | Nama kelas eksplisit harus cocok tepat satu kelas. Seluruh baris diperiksa sebelum insert; kelas kosong menggunakan kelas aktif yang valid. |
| Pembuatan kode untuk kelas lain tidak bekerja | Siswa dibaca dari kelas tujuan dengan pagination. Pembaruan bersyarat menjaga kode yang sudah ada dan jumlah sukses berasal dari baris yang diperbarui. |
| Pilihan CSV menghasilkan XLSX | CSV menggunakan unduhan CSV sebenarnya, dengan pengutipan isi sel dan perlindungan formula dari serializer proyek. |
| Query gagal ditampilkan seperti daftar kosong | Kegagalan penugasan, kelas, atau siswa menampilkan status error dan tombol Coba Lagi. |
| Tombol kode akses per siswa hanya menampilkan informasi | Tombol membuka konfirmasi dan membuat kode hanya untuk siswa yang dipilih. |

Pesan penolakan impor kini terlihat pada pratinjau. Setelah impor berhasil, dialog menampilkan hasil dan dapat ditutup melalui Selesai. Konfirmasi hapus menyebut pemindahan ke Sampah, sesuai perilaku soft delete.

Hak melihat semua kelas bagi pimpinan tetap terpisah dari hak pengelolaan administrator, pemilik kelas, dan wali kelas.

## Batas Verifikasi

Pengujian menggunakan fixture dan request Supabase yang dicegat, tanpa mengubah data produksi. Pemeriksaan jumlah siswa saat menghapus kelas berada di aplikasi, bukan transaksi atomik database; operasi langsung atau perubahan serentak setelah pemeriksaan terakhir tetap membutuhkan pengamanan database tersendiri.

Perubahan tidak memperluas dukungan format lain: ekspor PDF/JSON masih memakai fallback Excel yang sudah ada. Pembaca impor lama masih berbasis workbook XLSX; dukungan impor CSV/XLS bukan bagian dari delapan perbaikan ini.

## Pemeriksaan

- `npm test -- --maxWorkers=2`: 215 file dan 2.636 tes lolos, termasuk 24 tes regresi baru.
- Lint pada sumber dan tes yang berubah: tidak ada error. Lint seluruh repositori masih memiliki error lama `react-hooks/refs` pada `VoiceGradeModal.tsx:56`, di luar ruang lingkup Data Siswa.
- `git diff --check`: lolos. Pemindaian marker kredensial pada baris sumber yang ditambahkan tidak menemukan kandidat rahasia.
- Dependency tidak diubah. Audit dependency sebelumnya masih melaporkan 10 kerentanan produksi, yaitu 6 moderate dan 4 high; pembaruan dependency tidak dilakukan dalam perbaikan ini.

- `npx --no-install tsc --noEmit`: lolos pada pemeriksaan tipe akhir.
- Playwright `students-safety.spec.ts`: 8 tes lolos. Cakupan: seleksi lintas kelas, kode per siswa, error/retry dengan keyboard, tema terang/gelap, CSV sebenarnya, impor workbook, penjagaan hapus kelas, dan kode untuk kelas nonaktif. Viewport desktop 1440px dan ponsel 390px.

- `npm run build`: lolos, termasuk service worker PWA. Build browser awal sempat melewati timeout persiapan 180 detik ketika berjalan bersama typecheck; build akhir dijalankan terpisah dan berhasil.

## Review

Standar: mengikuti hook React Query, modal, serializer XLSX, dan validasi yang sudah ada. Tidak menambahkan dependency atau lapisan abstraksi baru.

Spesifikasi: kedelapan temuan memiliki perbaikan perilaku dan tes regresi. Perubahan tampilan dibatasi pada status kegagalan dan umpan balik impor.

## Antislop

Ruang lingkup visual hanya status error dan konfirmasi yang diubah, bukan desain ulang seluruh halaman. Arah mengikuti `DESIGN_SYSTEM.md` dan `DESIGN_STANDARDS.md`: layar kerja guru dengan ENERGY 1 / RHYTHM 1 / MOTION 1. Fokus berupa pesan kegagalan atau konfirmasi; ikon peringatan dan kunci mewakili tindakan sebenarnya. Tidak menambahkan ilustrasi, klaim produk, dekorasi, atau animasi.

Laporan gate berikut berlaku untuk perubahan visual tugas ini saja:

- R-02 PASS: pesan baru menggunakan Bahasa Indonesia tanpa em dash.
- R-03 PASS: screenshot dan pemeriksaan lebar dokumen pada 1440px dan 390px tidak menunjukkan overflow halaman; teks status error membungkus di ponsel.
- R-17 PASS: tidak menambahkan statistik produk; jumlah hasil operasi berasal dari baris database yang berhasil diperbarui.
- R-18 PASS: tidak menambahkan testimoni.
- R-23 PASS: tidak membuat aset visual baru; avatar fixture hanya dipakai dalam tes.
- R-24 PASS: tidak menambahkan navigasi atau tautan halaman.
- R-25 PASS: teks error baru memakai red-700 pada red-50 dengan kontras 5,91:1; status query memakai rose-700 pada rose-50 dengan kontras 5,72:1. Mode gelap memakai pasangan terang pada latar gelap dari komponen proyek yang sudah ada dan diperiksa melalui screenshot.
- R-26 PASS: pembuatan kode, retry, impor, dan ekspor memiliki tindakan nyata yang diverifikasi melalui tes; tidak ada tombol placeholder baru.
- R-27 PASS: skeleton dan empty state tetap tersedia; query gagal memakai status error terpisah.
- R-28 PASS: tidak menambahkan FAQ.
- R-32 PASS: tombol retry difokuskan dan diaktifkan dengan Enter pada kedua viewport; dialog menggunakan komponen modal dengan focus trap dan Escape yang sudah ada.
- R-33 PASS: perubahan sumber dilakukan langsung melalui patch, tanpa injeksi CSS atau source runtime.
- R-34 PASS: screenshot error terang dan gelap pada desktop serta ponsel diperiksa.
- R-35 PASS: aplikasi dijalankan, alur kode per siswa, perpindahan kelas, retry, ekspor CSV, dan impor workbook dicoba melalui Playwright. Penjagaan penghapusan kelas dan operasi massal juga memiliki tes hook.
- R-36 PASS: catatan menyebut batas transaksi database dan audit dependency; tidak mengklaim keamanan yang belum diverifikasi.
- R-37 PASS: arah mempertahankan pola desain proyek, dengan dial ENERGY 1 / RHYTHM 1 / MOTION 1.
- R-38 PASS: fixture tidak dimasukkan ke data produksi atau konten aplikasi.
- Purpose Gate PASS: ikon peringatan menandai kegagalan, ikon kunci untuk kode akses; tidak menambah gradient, glow, glassmorphism, badge, ilustrasi, atau animasi.
- Liveliness PASS: pesan kegagalan dan konfirmasi menjadi fokus; spasi mengikuti modal/status proyek, aksen merah hanya menandai kegagalan, dan Bahasa Indonesia konsisten dengan pekerjaan administrasi siswa.
- C-1 PASS: warna, spasi, ikon, dan modal mengikuti komponen proyek yang sudah ada.
- C-2 PASS: tidak menambah kontrol kosong; umpan balik penolakan impor dan hasil sukses diuji.
- C-3 PASS: tidak menambah bagian pemasaran atau bagian pengisi.
- C-4 PASS: error/retry diuji pada dua viewport, dua tema, dan keyboard; impor gagal tetap dapat dicoba ulang.
- C-5 PASS: jumlah pengujian berasal dari keluaran runner, tanpa statistik atau testimoni rekaan.
- Consistency Locks PASS: R-05, R-11, R-15, R-16, R-20, R-21, R-29, R-30, R-31 dipertahankan dengan perubahan kecil pada komponen yang ada, tanpa pola landing page, CTA generik, palet baru, atau peniruan visual produk lain.

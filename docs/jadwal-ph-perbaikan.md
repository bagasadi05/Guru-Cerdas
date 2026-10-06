# Pengelolaan Jadwal PH

Menu Jadwal PH memilih kelas wali kelas terlebih dahulu bila pengguna belum
memilih kelas. Penugasan wali kelas mengikuti semester yang dipilih.

## Izin dan validasi

Tombol pengelolaan mengikuti hasil `can_manage_ph_schedule` dari Supabase,
fungsi yang juga dipakai oleh RLS. Admin dan wali kelas dengan penugasan
`homeroom` pada semester terkait dapat mengelola jadwal. Wali kelas yang tercatat
langsung pada kelas juga dapat mengelola jadwal pada semester aktif. Guru mapel dapat
melihat jadwal. Kelas yang diarsipkan dan semester terkunci tidak dapat dikelola.

Mata pelajaran wajib diisi; materi tidak dapat menggantikan mata pelajaran.
Tanggal harus berada di antara tanggal awal dan akhir semester. Jam pelajaran
menggunakan angka 1–20 atau rentang, misalnya `1-2`. Rentang `1-2` dan `2-3`
dianggap bentrok pada tanggal dan kelas yang sama.

Validasi dilakukan di formulir dan trigger database. Trigger memakai kunci
transaksi per kelas dan semester sebelum memeriksa bentrok. Input beberapa PH
menggunakan satu insert: kegagalan satu baris membatalkan seluruh penyimpanan.
Data lama tidak dihapus atau diubah oleh migration; validasi berlaku saat menulis.

## Tampilan dan laporan

- Tampilan mingguan memuat Senin–Minggu agar agenda akhir pekan tetap terlihat.
- Jam pelajaran diurutkan sebagai angka, bukan urutan teks.
- Kegagalan memuat data atau izin memiliki keterangan dan tombol coba lagi.
- Tombol “Beberapa PH” menyediakan maksimal 20 baris dalam satu pengisian.
- Pilihan “Pratinjau laporan WhatsApp” pada menu berbagi menampilkan bagian PH pada semester
  aktif untuk hari ini dan tujuh hari ke depan. Tidak ada pesan yang dikirim.

Pratinjau dan laporan otomatis memanggil `build_wa_ph_section` yang sama.
Pratinjau tidak memberikan akses ke nomor wali kelas atau data laporan siswa.
Perubahan jadwal akan muncul pada laporan yang dibuat sesudah perubahan tersimpan.

## Perapihan tampilan

- Kelas, semester, pencarian, dan filter berada dalam satu panel. Tombol tambah
  menjadi tindakan utama; cetak, kalender, dan WhatsApp tersedia di menu berbagi.
- Pilihan Mingguan, Kartu, dan Tabel memiliki label. Filter status menampilkan
  jumlah jadwal, sedangkan tanggal yang sudah lewat tidak disebut ujian selesai.
- Tampilan mingguan tersusun vertikal di ponsel. Hari ini diberi penanda; nama
  mata pelajaran dapat membungkus ke beberapa baris tanpa terpotong.
- Formulir beberapa PH lebih lebar di desktop, dengan baris yang terpisah dan
  jumlah isian siap disimpan. Formulir tunggal memakai label yang lebih terbaca.
- Warna mengikuti palet teal aplikasi, termasuk pada mode gelap. Tombol navigasi
  dan tindakan utama memiliki area sentuh minimal 44 piksel.

Pratinjau visual diperiksa dengan data contoh pada lebar 390 dan 1440 piksel.
Pemeriksaan ini tidak mengubah jadwal atau mengirim pesan WhatsApp.

## Migration

- `20261003084157_harden_ph_schedule_management`
- `20261003084253_share_ph_report_preview`
- `20261003084650_allow_current_class_homeroom_ph`

Migration Supabase diterapkan pada 3 Oktober 2026. Perubahan tampilan tersedia
setelah aplikasi dibangun dan diterbitkan dengan kode terbaru.

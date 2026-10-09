# Pengelolaan Jadwal PH

Menu Jadwal PH memakai kelas yang diminta oleh tautan atau pengguna, lalu kelas
terakhir yang tersimpan untuk akun tersebut. Bila kelas tersimpan tidak lagi
tersedia, halaman memilih kelas wali kelas pada semester terkait atau kelas
pertama. Penyimpanan browser yang diblokir tidak menghalangi pemilihan kelas.

## Izin dan validasi

Izin dicek di Supabase lewat dua fungsi yang juga dipakai oleh RLS:

- `can_add_ph_schedule`: setiap akun guru yang sudah disetujui admin boleh
  menambah PH di kelas mana pun. Akun orang tua, siswa, dan akun yang belum
  disetujui tidak bisa.
- `can_manage_ph_schedule`: admin dan wali kelas mengelola semua PH di kelasnya.
  Wali kelas dikenali dari penugasan `homeroom` pada semester terkait, atau dari
  kolom wali kelas pada kelas untuk semester aktif.

Guru yang bukan wali kelas hanya bisa mengubah dan menghapus PH buatannya
sendiri. PH guru lain tetap bisa diduplikasi ke formulir. Kelas yang diarsipkan
dan semester terkunci tidak dapat ditambah atau diubah oleh siapa pun.

### Aktivasi Akses Semua Guru, 9 Oktober 2026

Migrasi `20261009090000_open_ph_schedule_to_all_teachers.sql` sudah diterapkan
dan dicatat pada riwayat database proyek. Sebelumnya database belum memiliki
`can_add_ph_schedule`, sehingga guru bukan wali kelas masih ditolak.
Migrasi `20261009100000_allow_teachers_to_list_ph_classes.sql` juga sudah
diterapkan agar guru bisa memilih kelas yang tidak ditugaskan kepadanya. RPC
`list_ph_schedule_classes` hanya memberikan ID, nama kelas, dan ID wali kelas.
Policy kelas dan data siswa tidak diperluas. Hanya dua migrasi PH ini yang
dijalankan, bukan `db push` seluruh migrasi.

Uji database dalam `supabase/tests/ph_schedule_permissions.sql` mencakup:

- Semua 41 guru yang disetujui dapat menambah PH pada 20 kelas aktif dan dua
  semester yang tidak terkunci.
- Daftar kelas PH memuat semua kelas aktif, termasuk kelas tanpa penugasan guru.
- Guru bukan wali kelas dapat menyimpan PH serta mengubah dan menghapus lunak
  PH miliknya.
- Perubahan, penghapusan lunak, dan penghapusan permanen PH guru lain ditolak.
- Insert yang memalsukan pembuat, kelas/semester tidak valid, akun tanpa peran
  guru yang disetujui, dan pemanggil tanpa autentikasi ditolak.

Uji memakai transaksi yang di-rollback, termasuk jadwal dan notifikasi uji.
Definisi izin admin/wali kelas serta jumlah jadwal dan notifikasi lama tidak
berubah saat migrasi diterapkan. Akses akun siswa, orang tua, dan guru yang belum
disetujui tetap dibatasi oleh fungsi izin.

Frontend workspace sudah memakai fungsi izin tambah terpisah dari izin edit/hapus.
Aktivasi database tidak menerbitkan frontend secara otomatis: perubahan frontend
masih perlu commit, push, dan deployment sebelum berlaku di situs produksi.

Sebelas tes browser lulus, termasuk guru tanpa penugasan wali kelas yang menambah
PH di kelas lain, pembatasan tombol edit/hapus berdasarkan pembuat, dan
penyembunyian kontrol tambah saat izin ditolak. Request simpan memakai akun
pembuat yang sedang masuk, bukan akun wali kelas. Request browser memakai mock
dan tidak menyimpan PH ke database produksi.

Review standar PASS: perubahan memakai fungsi izin, RLS, dan pola tes yang sudah
ada; tidak menambah dependency atau kredensial ke source. Review spesifikasi
PASS: izin tambah untuk semua guru aktif sudah diterapkan di database, tanpa
mengubah izin admin/wali kelas. Deployment frontend dinyatakan belum dilakukan.
Gate antislop dokumentasi PASS: klaim aktivasi dan izin ditopang riwayat migrasi,
uji RLS yang di-rollback, serta hasil browser; tidak ada perubahan desain baru.

## Notifikasi wali kelas

Wali kelas mendapat notifikasi di lonceng saat guru lain menambah, mengubah
(mapel, tanggal, atau jam), atau membatalkan PH di kelasnya. Wali kelas tidak
mendapat notifikasi atas perubahan yang ia buat sendiri. "Beberapa PH" yang
disimpan sekaligus dikirim sebagai satu notifikasi ringkasan, berisi tiga PH
pertama dan jumlah sisanya. Notifikasi membuka `/jadwal?tab=ph&kelas=<id>`.
Notifikasi dibuat oleh trigger database, jadi tetap terkirim apa pun cara datanya
masuk.

Mata pelajaran wajib diisi; materi tidak dapat menggantikan mata pelajaran.
Tanggal harus berada di antara tanggal awal dan akhir semester. Jam pelajaran
menggunakan angka 1–20 atau rentang, misalnya `1-2`. Rentang `1-2` dan `2-3`
dianggap bentrok pada tanggal dan kelas yang sama.

Validasi dilakukan di formulir dan trigger database. Trigger memakai kunci
transaksi per kelas dan semester sebelum memeriksa bentrok. Input beberapa PH
menggunakan satu insert: kegagalan satu baris membatalkan seluruh penyimpanan.
Data lama tidak dihapus atau diubah oleh migration; validasi berlaku saat menulis.

## Tampilan dan laporan

- Status tanggal memakai Hari ini, Mendatang, dan Lewat. Dot kecil membantu
  membedakan mapel, dengan warna yang sama pada tabel, kartu, dan agenda mingguan.
  Nama mapel tetap ditampilkan, sehingga warna bukan satu-satunya petunjuk.
- Baris "PH berikutnya" di atas daftar menunjukkan satu PH terdekat beserta tanggal
  dan jamnya, termasuk bila jadwalnya ada di minggu berikutnya.
- Panel filter (pencarian, bulan, status, pilihan tampilan) memakai latar lebih redup
  agar pemilihan kelas dan tombol tambah tetap menjadi bagian utama.
- Tombol "Hapus filter" hanya muncul di satu tempat: di panel filter bila masih ada
  hasil, atau di kartu kosong bila filter tidak cocok dengan jadwal mana pun.
- Tampilan mingguan memuat Senin–Minggu agar agenda akhir pekan tetap terlihat.
- Hari yang sudah lewat tampil lebih redup; hari ini diberi batas dan label khusus.
- Jam pelajaran diurutkan sebagai angka, bukan urutan teks.
- Kegagalan memuat data atau izin memiliki keterangan dan tombol coba lagi.
- Tombol Tambah Massal menyediakan maksimal 20 baris dalam satu pengisian dan
  memiliki tooltip dalam Bahasa Indonesia.
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

## Tindak Lanjut Review 9 Oktober 2026

- Filter status sekaligus menjadi ringkasan jumlah PH; tidak ada kartu statistik
  tambahan yang mengulang angka tersebut.
- Minggu tanpa PH menampilkan satu empty state dan satu tombol tambah. Minggu
  dengan PH tetap memperlihatkan agenda setiap hari, termasuk akhir pekan.
- Filter Lewat mengurutkan tanggal terbaru dahulu. Pilihan urutan dapat diubah.
- Kolom Jam Ke- menampilkan angka/rentang tanpa mengulang kata Jam.
- Tombol Nilai memakai aksen teal solid, termasuk pada tampilan mingguan.
- Parser materi yang dipakai formulir juga dipakai pada daftar: materi asli
  ditampilkan terpisah, sementara isian kosong memakai Materi belum diisi.
- Tab PH memakai teal, dan pencarian lokal diberi konteks jadwal PH.

Status Sudah dinilai belum diaktifkan. Data nilai belum memiliki hubungan unik
ke jadwal PH; mencocokkan mapel saja berisiko menganggap PH lain telah dinilai.
Label Lewat hanya menyatakan tanggal, bukan penyelesaian penilaian. Pengaitan
nilai membutuhkan perubahan model data dan alur simpan nilai tersendiri.

Pencarian global tetap mencari lintas halaman. Perubahan pencarian global menjadi
khusus PH belum dilakukan karena akan mengubah perilaku navigasi aplikasi.

Pengujian terarah: 37 tes komponen/engine dan 8 tes browser. Browser memakai
fixture pada lebar 390, 768, dan 1440 piksel, tema terang/gelap, serta menguji
pemilihan kelas, penyimpanan pilihan, empty state, urutan terbaru, dan tabel.
Tidak ada pengubahan jadwal produksi atau pengiriman WhatsApp dalam pengujian.

### Gate Tampilan

Gate berikut hanya mencakup perubahan tampilan pada review ini, bukan seluruh
aplikasi atau usulan status penilaian yang belum terhubung. Arah mengikuti layar
kerja guru yang sudah ada: ENERGY 1 / RHYTHM 1 / MOTION 1. Hierarki utama adalah
kelas, filter yang dapat diklik, lalu agenda; aksen teal menandai tindakan Nilai.

- Hard Gate PASS: R-02, R-03, R-17, R-18, R-23, R-24, R-25, R-26, R-27,
  R-28, R-32, R-33, R-34, R-35, R-36, R-37, R-38. Tidak ada data produk rekaan,
  navigasi baru, atau placeholder tindakan. Data fixture tidak masuk produksi.
  Screenshot dan interaksi diuji pada tiga viewport dan dua tema. Teks tombol
  Nilai putih pada teal-700 memiliki kontras 5,47:1; angka filter aktif memakai
  brand-800 pada putih, 8,63:1. Navigasi minggu memakai ikon agar label tidak
  terpotong di ponsel; nama aksesibel dan tooltip tetap tersedia.
- Purpose Gate PASS: R-01, R-04, R-06, R-07, R-08, R-09, R-10, R-12,
  R-13, R-14, R-19, R-22. Dot mapel membantu pemindaian tanpa menggantikan teks;
  ikon kalender, tambah, lapisan, panah, dan penilaian mewakili tindakan nyata.
  Tidak menambahkan ilustrasi, blur, glow, atau animasi dekoratif.
- Liveliness PASS: fokus berada pada pilihan kelas dan agenda, jumlah PH berasal
  dari data, spasi membedakan konteks dan filter, dan identitas warna aplikasi
  dipertahankan tanpa membuat section menjadi kartu di dalam kartu.
- Craftsmanship dan Consistency Locks PASS: C-1 sampai C-5; R-05, R-11, R-15,
  R-16, R-20, R-21, R-29, R-30, R-31. Perubahan memiliki tujuan kerja yang
  jelas, mempertahankan pola formulir/navigasi, dan tidak menyimpulkan status
  penilaian dari tanggal. Warna mapel hanya menjadi penanda kecil pendamping.

Standar: parser materi dibagi dengan formulir, penyimpanan pilihan dibatasi per
akun, dan ID yang sudah tidak tersedia diabaikan. Izin penulisan tetap melalui
RPC dan RLS yang sudah ada dalam perubahan lokal.

Spesifikasi: perbaikan tampilan, pilihan kelas, dan urutan diterapkan. Status nilai
dan pencarian global dinyatakan belum diubah, bukan diklaim selesai.

### Hasil Pemeriksaan Repositori

- Typecheck dan build produksi/PWA lulus. Lint pada sumber/tes PH tidak memiliki error; dua
  warning Fast Refresh pada ekspor helper formulir masih ada.
- Suite seluruh repositori pada aktivasi akses guru: 219 file lulus, dua file
  gagal; 2.676 tes lulus, dua tes gagal. Kegagalan berada pada
  `smart-insights-panel.test.tsx:98`,
  yang mencari teks Kelas 1C secara tunggal padahal sekarang muncul dua kali.
  Komponen dan tes tersebut tidak diubah pada perbaikan PH ini.
- `studentCsvDownload.test.ts` timeout saat suite penuh, tetapi lulus saat
  diulang dalam run terarah. Tes dan kode unduhan CSV tidak diubah pada tugas ini.
- Lint seluruh repositori masih gagal pada `VoiceGradeModal.tsx:56`, yaitu
  pembacaan ref saat render, di luar ruang lingkup PH.
- `git diff --check` lulus. Pemindaian marker kredensial pada baris kode yang
  ditambahkan tidak menemukan kandidat rahasia. Tidak ada dependency yang diubah.

## Migration

- `20261003084157_harden_ph_schedule_management`
- `20261003084253_share_ph_report_preview`
- `20261003084650_allow_current_class_homeroom_ph`
- `20261009090000_open_ph_schedule_to_all_teachers`
- `20261009100000_allow_teachers_to_list_ph_classes`

Tiga migrasi awal diterapkan pada 3 Oktober 2026; dua migrasi akses semua guru
diterapkan pada 9 Oktober 2026. Perubahan tampilan tersedia
setelah aplikasi dibangun dan diterbitkan dengan kode terbaru.

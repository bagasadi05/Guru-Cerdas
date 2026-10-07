# Analitik Akademik

Menu Analitik (`/analytics`) menampilkan nilai, kehadiran, dan karakter siswa
dari kelas yang boleh dilihat pengguna. Catatan ini menjelaskan aturan hitung
tab Akademik setelah perbaikan Oktober 2026.

## Pengambilan data

- Semua tabel dibaca per halaman 1000 baris (`fetchAllPages`), jadi data kelas
  besar tidak lagi terpotong diam-diam.
- Kalau satu bacaan gagal, halaman menampilkan pesan dan tombol coba lagi.
  Angka kosong tidak lagi muncul seolah-olah datanya memang nol. Kalau data
  lama masih ada, angka lama tetap tampil dengan peringatan di atasnya.
- Nama mapel yang hanya beda huruf besar-kecil atau spasi digabung. Nilai di
  luar 0–100 dibuang, tidak dihitung sebagai 0.
- Tab, kelas, dan bulan tersimpan di URL (`?tab=academic&kelas=…&periode=2026-09`),
  jadi halaman bisa dibagikan dan tetap sama setelah dimuat ulang.

## Cakupan waktu

Nilai selalu dihitung untuk seluruh semester aktif. Filter bulan hanya
berlaku untuk kehadiran, pelanggaran, dan poin keaktifan. Tab Akademik dan PDF
menuliskan cakupan ini. Kalau belum ada semester aktif, nilai dari semua
semester ikut dihitung dan halaman memberi tahu hal itu.

## Aturan hitung

- **KKTP** memakai KKM guru dari Pengaturan, sama dengan halaman Input Nilai.
  Nilai bawaan 75 hanya dipakai kalau guru belum mengaturnya.
- **Rata-rata siswa** = rata-rata dari rata-rata tiap mapel, sehingga mapel
  dengan banyak PH tidak lebih berat. **Rata-rata kelas/mapel** = rata-rata
  dari rata-rata siswa. Kartu KPI, grafik distribusi, dan PDF memakai angka yang sama.
- **Predikat** A–D mengikuti metode interval: D di bawah KKTP, lalu rentang
  KKTP–100 dibagi tiga. Dengan KKTP 75: C 75–82, B 83–91, A 92–100.
- **Status mapel**: aman jika rata-rata ≥ KKTP, perlu perhatian jika di bawah,
  kritis jika lebih dari 7 poin di bawah.
- **Tren** membandingkan rata-rata penilaian terakhir dengan penilaian
  sebelumnya, misalnya PH 2 dengan PH 1. Urutan penilaian diambil dari waktu
  input pertama karena tabel nilai belum punya tanggal pelaksanaan. Mapel
  dengan satu penilaian belum punya tren.
- **Kelengkapan nilai**: sebuah penilaian dianggap sudah berjalan di sebuah
  kelas begitu ada satu siswa kelas itu yang punya nilainya. Semua siswa kelas
  itu lalu diharapkan punya nilai. Kartu KPI menampilkan persentase dan jumlah
  nilai yang belum terisi.

## Tampilan

- Urutan tab: KPI, insight, Siswa di Bawah KKTP, per mapel, tren, kelengkapan
  nilai, lalu sebaran predikat. Bagian yang paling sering dipakai guru ada di atas.
- Kartu memakai gaya `Card` bawaan design system. Teks keterangan minimal 12px
  dan lolos kontras WCAG AA di mode terang dan gelap.
- Tombol tampilan grafik dan tombol mapel di legenda setinggi 44px di HP.
  Status aktif tombol mapel ditandai titik penuh dan `aria-pressed`, bukan warna teks.
- Kartu mapel menulis jumlah siswa di bawah KKTP secara langsung, jadi tidak
  perlu hover pada bar sebaran.
- Daftar **Siswa di Bawah KKTP** mengumpulkan semua mapel per siswa dan
  menautkan ke halaman detail siswa. Insight "siswa di bawah KKTP" membuka daftar ini.
- Tombol **Input Nilai** di detail mapel membawa kelas yang sedang dipilih.
- PDF bagian nilai memuat predikat, rekap per mapel, dan daftar siswa di bawah KKTP.

## Insight AI

Insight dasar dihitung di perangkat dan selalu tampil. AI hanya dipanggil saat
guru menekan **Analisis dengan AI**. Nama siswa tidak dikirim; AI menerima
label "Siswa 1", "Siswa 2", dan nama asli dipasang kembali di perangkat.
Tingkat dan tombol aksi dari AI disaring ke daftar yang dikenal. Kalau data
berubah, hasil AI lama disembunyikan sampai guru meminta analisis baru.

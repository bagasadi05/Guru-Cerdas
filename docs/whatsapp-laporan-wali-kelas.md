# Laporan WhatsApp harian wali kelas

Laporan dibuat dari database Guru Cerdas dan masuk ke `wa_outbox`. Worker VPS
mengirimnya melalui sesi Baileys yang sudah terhubung. Pengiriman dijadwalkan
Senin–Jumat pukul 17.00 WIB (`0 10 * * 1-5`, timezone cron GMT).

Penerima aktif mencakup 20 wali kelas dari kelas 1A sampai 6D, termasuk 3A.
Pemetaan nomor disimpan di `wa_report_recipients`, dengan satu penerima per kelas.
Kelas yang diarsipkan, dihapus, atau dinonaktifkan dari daftar penerima dilewati.

Migration `20261003052032_schedule_wa_class_reports` diterapkan melalui MCP Supabase
pada 3 Oktober 2026. Job aktif dan penerima 3A sudah dikonfigurasi. Pratinjau pada
hari pemasangan tidak menambahkan pesan ke antrean. Pengiriman terjadwal pertama
adalah Senin, 5 Oktober 2026 pukul 17.00 WIB.

## Isi laporan

Laporan dibuka dengan salam sore, sapaan Ustadz/Ustadzah, dan nama wali kelas
dari data kelas. Perkenalan Robot Guru Cerdas memakai versi lengkap sampai
ada laporan kelas tersebut yang berstatus `sent`; laporan berikutnya memakai
pembuka lebih singkat. Penutup berisi terima kasih atas pendampingan anak-anak,
doa agar ilmu dan kesabaran menjadi amal kebaikan, serta ucapan selamat beristirahat.

Sapaan diatur melalui kolom `wa_report_recipients.salutation`: `Ustadz`,
`Ustadzah`, atau `Ustadz/Ustadzah`. Kelas 3A memakai `Ustadz`; penerima lainnya
memakai `Ustadz/Ustadzah` sampai sapaan masing-masing ditentukan. Sapaan tidak
disimpulkan dari nama guru. Format ini diterapkan oleh migration
`20261003054041_warm_wa_class_reports`.

- Pelanggaran pada tanggal laporan: nama siswa, uraian, poin, status tindak lanjut,
  serta catatan guru dan tindak lanjut bila tersedia. Maksimal empat detail ditampilkan.
- Jadwal PH pada tanggal laporan dan tujuh hari setelahnya: tanggal, mata
  pelajaran/materi dari kolom `subject`, serta jam pelajaran dari `period_label`.
  Hanya jadwal kelas penerima pada semester aktif yang belum dihapus yang
  disertakan. Maksimal lima jadwal ditampilkan, diurutkan berdasarkan tanggal
  dan jam pelajaran; jumlah sisanya diarahkan ke aplikasi. Bila kosong, laporan
  menyebutkan belum ada jadwal PH yang tercatat untuk rentang tersebut.
- Kehadiran yang tercatat pada tanggal laporan. Status resmi digunakan bila tersedia,
  kemudian status guru, kemudian status dasar. Siswa tanpa catatan ditandai sebagai
  belum memiliki catatan; mereka tidak dianggap hadir secara otomatis oleh laporan.
- Nilai baru yang dibuat pada hari itu menurut WIB, termasuk maksimal empat nilai
  di bawah ambang laporan. Ambang awal 75, dapat diubah melalui `minimum_score`.
  Ambang ini terpisah dari KKM guru yang saat ini disimpan di browser.
- Kuis/keaktifan pada tanggal laporan: jumlah catatan, jumlah siswa, dan maksimal
  tiga kegiatan. Laporan tidak menyimpulkan prestasi dari catatan yang tidak memuatnya.

Data siswa dan catatan yang dihapus dilewati. Pelanggaran dan kuis memakai tanggal
kejadian/kegiatan; nilai memakai `created_at` karena belum ada tanggal penilaian
atau waktu pembaruan di tabel tersebut. Perubahan nilai lama tidak dihitung sebagai
nilai baru. Laporan merupakan snapshot pada jam pengiriman; input sesudahnya belum
tercakup. Hari tanpa data tetap menghasilkan laporan dengan keterangan belum ada
catatan, sehingga ketiadaan data tidak disebut sebagai kepastian tidak ada kejadian.

Laporan dibatasi 4.000 karakter. Bila detail banyak, jumlah keseluruhan tetap
ditampilkan dan rincian lain diarahkan ke aplikasi.

## Jadwal dan pencegahan pesan ganda

Job `wa-daily-class-report` menjalankan `enqueue_wa_daily_reports()` langsung
di PostgreSQL. Tidak diperlukan Edge Function atau secret jadwal tambahan.
Tanggal default menggunakan `Asia/Jakarta`; fungsi juga menolak pengiriman pada
Sabtu dan Minggu. Kalender hari libur belum menjadi aturan pengiriman.

ID antrean: `laporan-<class_id>-<tanggal-WIB>`. Pemanggilan ulang pada tanggal yang
sama tidak menimpa atau menambahkan laporan yang sudah ada. Ini mencegah duplikasi
antrean; batasan pengiriman saat crash tetap mengikuti penghubung WhatsApp.

## Keamanan dan pengelolaan

Tabel penerima serta fungsi pembuat laporan hanya dapat diakses backend
`service_role` dan pemilik database. Browser tidak mendapat hak baca nomor atau
hak menambahkan laporan. Nomor tujuan berasal dari tabel penerima.

Nonaktifkan penerima dengan mengubah `enabled` menjadi `false` melalui backend
atau SQL Editor. Perubahan waktu dilakukan pada job cron dengan konversi WIB ke UTC.
Jadwal laporan Telegram yang sudah ada memiliki job terpisah.

Pratinjau tanpa memasukkan pesan ke antrean, melalui SQL Editor:

```sql
select * from public.enqueue_wa_daily_reports(
  p_report_date => (now() at time zone 'Asia/Jakarta')::date,
  p_dry_run => true
);
```

Verifikasi jadwal dan status antrean melalui SQL Editor:

```sql
select jobname, schedule, active
from cron.job where jobname = 'wa-daily-class-report';

select id, status, attempts, sent_at, error
from public.wa_outbox where id like 'laporan-%'
order by created_at desc limit 20;
```

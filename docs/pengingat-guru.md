# Pengingat jadwal dan tugas guru

Cron `dispatch-scheduled-notifications` memanggil `dispatch-push` setiap lima menit.
Perhitungan hari dan waktu menggunakan **Asia/Jakarta**, meskipun timezone cron
database adalah GMT.

## Perilaku

- Jadwal mingguan mengirim pengingat pertama 5–10 menit sebelum mulai.
- Ringkasan tugas dikirim mulai pukul 06.00 WIB setiap hari. Percobaan ulang
  tersedia sampai pukul 07.00 WIB. Ringkasan kosong tidak dikirim.
- Ringkasan menyebut jumlah tugas hari ini, mendatang dalam rentang pilihan guru,
  dan terlambat. Tugas `done`, dihapus, atau tanpa tenggat tidak disertakan.
- Tenggat berupa tanggal: tugas hari ini belum terlambat sampai tanggal WIB berganti.
- Klik notifikasi membuka `/jadwal` atau `/tugas`, termasuk saat aplikasi sudah terbuka.

## Pengaturan akun

`user_notification_preferences` menyimpan sakelar pengingat tugas dan rentang 0–3
hari. Akun hanya dapat membaca dan mengubah pengaturannya sendiri. Akun yang
belum mempunyai pengaturan server memakai default aktif dan satu hari sebelumnya.

Saat login pertama setelah pembaruan, pengaturan browser dimigrasikan jika akun
belum mempunyai baris server. Nilai 6/12 jam menjadi hari ini; 24/48/72 jam menjadi
1/2/3 hari sebelumnya. Pengaturan server menjadi acuan pada login dan saat halaman
Pengaturan kembali difokuskan. Nilai lama dari satu browser hanya diimpor ke satu
akun; akun lain memiliki cache terpisah.

Pengaturan tugas disimpan ke server sebelum pesan berhasil ditampilkan. Kontrol
akun dinonaktifkan saat offline. Preferensi suara dan pengingat lokal lainnya
tetap menggunakan penyimpanan browser.

## Pengiriman dan autentikasi

`teacher_reminder_deliveries` mencatat tanggal kejadian, jenis pengingat, ID
jadwal/akun, serta subscription. RPC khusus server melakukan reservasi atomik
selama dua menit dan mencatat keberhasilan per perangkat. Tidak ada cron reset
`schedules.reminded` yang dibutuhkan.

Kegagalan sementara dicoba ulang sebelum kelas mulai atau sebelum batas ringkasan
pagi. Subscription dengan respons 404/410 dinonaktifkan. Maksimal delapan kiriman
diproses bersamaan, dengan timeout layanan push sepuluh detik.

Langganan dengan kunci VAPID lama dicatat sebagai `vapid_key_mismatch` dan tidak
dihapus. Saat guru membuka halaman aplikasi mana pun, browser memperbarui
langganannya jika kunci berubah. Pengaturan pengingat juga disinkronkan saat itu.
Browser yang sudah ikut serta dan mengizinkan notifikasi dapat membuat ulang
langganan yang hilang. Menonaktifkan push hanya berlaku pada perangkat tersebut;
perangkat lain pada akun yang sama tetap terdaftar.

HTTP sukses dari layanan push berarti pesan diterima layanan tersebut, bukan
konfirmasi pesan sudah terlihat di layar perangkat. Kegagalan antara penerimaan
layanan push dan pencatatan database masih dapat menyebabkan pengiriman ulang.

Endpoint memakai `verify_jwt = false` karena cron tidak membawa JWT pengguna.
Setiap permintaan wajib membawa `X-Internal-Secret` yang cocok dengan
`app_config.dispatch_push_secret`, atau bearer service role. Secret tidak ditulis
ke repo. Tabel catatan kirim dan RPC reservasi tidak dapat diakses browser.

## Verifikasi dan deploy

1. Terapkan migrasi skema secara terarah melalui MCP Supabase; cron awal dibuat
   nonaktif. Cocokkan nama file lokal dengan version/name riwayat penerapannya.
2. Deploy dispatcher beserta semua modul `_shared` yang diimpor, lalu frontend.
   Jangan merotasi VAPID saat mengaktifkan pengingat; kunci publik harus cocok
   dengan kunci langganan browser.
3. Panggil endpoint terautentikasi dengan `{"mode":"all","dryRun":true}`.
   Dry run membaca kandidat tanpa mengirim push, melakukan reservasi, atau menulis
   perubahan subscription. Kesalahan autentikasi, input, dan query harus menghasilkan
   respons gagal.
4. Untuk uji satu perangkat, gunakan `{"mode":"test","subscriptionId":"UUID"}`.
   ID wajib milik satu subscription guru aktif; mode ini tidak dapat menyiarkan
   tes ke seluruh pelanggan. Tambahkan `dryRun:true` untuk memeriksa target saja.
5. Aktifkan cron lewat migrasi aktivasi. Pastikan cron dispatcher lama tidak aktif.

Workflow memakai `scripts/verify-teacher-reminders.mjs` untuk memeriksa cron dan
dry run terautentikasi. Script mengambil secret melalui Management API Supabase tanpa
mencetaknya. Verifikasi yang gagal menghentikan workflow.
Opsi `--preflight` mengizinkan pemeriksaan cron yang masih nonaktif sebelum
rollout; workflow menggunakan pemeriksaan penuh yang mewajibkan cron aktif.

Riwayat migrasi lama masih perlu direkonsiliasi sebelum memakai `db push` global.
Deploy pengingat ini menggunakan migrasi baru secara terarah.
Pada push, workflow memeriksa bahwa migrasi baru sudah tercatat di produksi dan
tidak menjalankan `db push` global. Migrasi historis tidak boleh diedit melalui
jalur ini. `db push` tersedia hanya lewat dispatch manual dengan
`deploy_database=true`, setelah riwayat lama direkonsiliasi.

## Pemantauan dan rollback

### Status rollout 4 Oktober 2026

Frontend `e4760cc0` sudah terpasang di produksi. Migrasi skema sudah diterapkan
dan dispatcher sudah dideploy. Pemeriksaan RLS, reservasi atomik, deduplikasi,
autentikasi, dan dry run tanpa penulisan database berhasil.

Uji awal pada langganan Apple dan Google ditolak karena kunci VAPID lama.
Setelah perangkat didaftarkan ulang, layanan push menerima uji kirim satu
perangkat dengan HTTP 200. Cron diaktifkan pada 15.42 WIB dan verifikasi penuh
cron serta dry run berhasil. Migrasi aktivasi sudah dicocokkan dengan riwayat
Supabase: `20261004084249_enable_teacher_reminder_cron.sql`.

Pantau selama 24 jam pertama:

- `cron.job_run_details`: job harus berjalan setiap lima menit.
- `net._http_response`: periksa status HTTP pemanggilan dispatcher.
- Log Edge Function: `candidates`, `tasksNotified`, `schedulesNotified`, `failedSends`.
- `teacher_reminder_deliveries`: periksa `delivered_at`, `attempts`, dan `last_error`.

Rollback pengiriman otomatis:

```sql
SELECT cron.alter_job(jobid, active := false)
FROM cron.job WHERE jobname = 'dispatch-scheduled-notifications';
```

Kalender libur belum menjadi sumber aturan pengingat pada tahap ini. Kalender
terpusat, ajakan notifikasi orang tua, audit menu, serta perbaikan tes PH adalah
pekerjaan berikutnya.

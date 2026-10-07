# Laporan WhatsApp ke Wali Kelas lewat Fonnte

Laporan harian kelas dikirim ke wali kelas lewat [Fonnte](https://fonnte.com/), menggantikan poller Baileys di VPS. Antrean, isi laporan, dan jadwalnya tidak berubah.

## Alur

1. Pukul 17.00 WIB (Senin–Jumat), cron `wa-daily-class-report` mengisi `public.wa_outbox` dengan satu laporan per kelas.
2. Setiap menit, cron `wa-fonnte-sender` memanggil Edge Function `wa-fonnte-sender`. Fungsi baru mengirim kalau jeda sejak pengiriman sebelumnya sudah lewat. Jedanya acak 4–7 menit per pesan, dan Fonnte menampilkan "sedang mengetik" sebelum pesan masuk, supaya polanya tidak terlihat seperti robot. 20 laporan selesai dalam sekitar 2 jam.
3. Fungsi hanya mengirim antara 06.00 dan 21.00 WIB.
4. Laporan dari hari yang sudah lewat tidak dikirim terlambat; laporan itu ditandai `expired`.
5. Kalau Fonnte menolak (misalnya perangkat terputus), pesan dicoba lagi di putaran berikutnya, paling banyak 3 kali.
6. Kalau permintaan ke Fonnte tidak selesai (koneksi putus atau batas waktu habis), pesan **tidak** dikirim ulang, karena Fonnte mungkin sudah menerimanya. Ini mencegah wali kelas menerima laporan ganda. Statusnya `delivery_unknown`.
7. Kalau pesan akhirnya gagal, wali kelas menerima push notification bahwa laporan kelasnya belum terkirim lewat WhatsApp. Notifikasi ini hanya sampai ke wali kelas yang sudah mengaktifkan notifikasi di aplikasi.

Status `sent` berarti Fonnte sudah menerima pesan ke antreannya. Nomor pesan dari Fonnte disimpan di kolom `wa_id`.

## Pemasangan (sekali)

1. Di dashboard Fonnte, tambahkan perangkat dengan nomor pengirim, lalu scan QR sampai statusnya tersambung. Pakai nomor sekolah yang sudah lama aktif, bukan nomor baru.
2. Salin token perangkat itu. Di Supabase Dashboard → Edge Functions → Secrets, buat secret `FONNTE_TOKEN` berisi token tersebut. Jangan simpan token di repo, di `.env` yang ter-commit, atau di percakapan.
3. Matikan poller Baileys di VPS. Kalau tetap menyala, keduanya akan mengambil pesan dari antrean yang sama.
4. Minta setiap wali kelas menyimpan nomor pengirim dan membalas sekali. Pengiriman ke nomor yang belum pernah berinteraksi lebih berisiko diblokir.

Tanpa `FONNTE_TOKEN`, fungsi menjawab 503 dan tidak mengambil pesan apa pun.

## Paket Free

- Kuota 1.000 pesan per bulan. Dengan 20 wali kelas dan laporan Senin–Jumat, pemakaian sekitar 420–460 pesan per bulan. Percobaan ulang juga memakan kuota.
- Fonnte menambahkan watermark di setiap pesan. Paket Lite menghapusnya.
- Fonnte tidak memakai API resmi WhatsApp. Risiko nomor diblokir tetap ada dan menjadi tanggung jawab pemilik nomor.

## Memantau

Ringkasan pengiriman hari ini (jalankan sebagai service role):

```sql
select public.worker_delivery_health();
```

Rincian per pesan:

```sql
select id, status, attempts, wa_id, error, sent_at from public.wa_outbox order by created_at desc limit 25;
```

Log fungsi ada di Supabase Dashboard → Edge Functions → `wa-fonnte-sender` → Logs.

## Berkas

- `supabase/functions/_shared/wa-fonnte.ts`: aturan pengiriman (dites di `supabase/functions/_shared/__tests__/wa-fonnte.test.ts`).
- `supabase/functions/wa-fonnte-sender/index.ts`: Edge Function, panggilan ke Fonnte, dan push ke wali kelas.
- `supabase/migrations/20261006115935_wa_fonnte_sender_cron.sql`: secret internal dan cron.
- `supabase/migrations/20261006122304_wa_fonnte_random_gap.sql`: cron tiap menit dan `worker_delivery_health` yang memakai jeda terpanjang (420 detik).

Deploy ulang fungsi:

```sh
npx supabase functions deploy wa-fonnte-sender --project-ref <project-ref> --no-verify-jwt --use-api
```

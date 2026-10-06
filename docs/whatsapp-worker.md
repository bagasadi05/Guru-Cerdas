# Penghubung WhatsApp melalui Supabase

Backend menambahkan laporan ke `public.wa_outbox`. Worker VPS mengambil antrean
melalui Edge Function `wa-worker`, mengirim pesan lewat Baileys, lalu melaporkan
hasilnya. VPS menyimpan token worker; service role tetap berada di Supabase.

## Status deployment 3 Oktober 2026

Migration `20261003042918_create_wa_outbox` telah diterapkan melalui MCP Supabase
ke proyek `fddvcyqbfqydvsfujcxd`. Fungsi `wa-worker` versi 1 aktif dengan token
worker tersimpan di Supabase Secrets.

Endpoint: `https://fddvcyqbfqydvsfujcxd.supabase.co/functions/v1/wa-worker`.
Pemeriksaan endpoint menghasilkan 401 untuk token salah, 200 untuk klaim dan
recovery dengan token benar, serta 409 untuk completion tanpa klaim yang cocok.
Akses anon ke tabel dan RPC menghasilkan 401. Antrean kosong saat pemeriksaan;
tidak ada pesan WhatsApp yang ditambahkan untuk pengujian.

Konfigurasi rahasia yang sama masih perlu dipasang di VPS. Status deployment
Supabase belum membuktikan poller VPS aktif atau WhatsApp tersambung.

## Berkas proyek

- `supabase/migrations/20261003042918_create_wa_outbox.sql`: tabel dan RPC internal.
- `supabase/functions/wa-worker/index.ts`: fungsi untuk worker.
- `supabase/functions/wa-worker/handler_test.ts`: pengujian autentikasi dan kontrak HTTP.
- `supabase/config.toml`: `verify_jwt = false` untuk `wa-worker`. Autentikasi
  dilakukan oleh fungsi melalui `X-Worker-Token`.

## Pemasangan

Terapkan migration melalui alur deployment proyek. Untuk pemasangan manual,
jalankan **migration proyek**, bukan SQL v2 dari dokumen Muse, pada SQL Editor
Supabase proyek yang dituju. Migration menambahkan kolom klaim bila tabel v1
sudah ada dan tidak menghapus pesan.

Masukkan `WA_WORKER_TOKEN` melalui Supabase Dashboard → Edge Functions → Secrets.
Gunakan token acak minimal 32 byte. Masukkan nilai yang sama melalui konfigurasi
rahasia di VPS, bersama `SUPABASE_URL` dan `SUPABASE_ANON_KEY`. Jangan masukkan
token ke variabel `VITE_*`, repo, dokumentasi, atau percakapan.

Deploy fungsi dengan Supabase CLI yang sudah diautentikasi:

```sh
supabase functions deploy wa-worker --project-ref <project-ref> --no-verify-jwt
```

Workflow `supabase-deploy.yml` juga mencakup fungsi ini. Tanpa secret worker,
fungsi menolak semua permintaan antrean dengan 401.

## Kontrak VPS

Alamat: `POST <SUPABASE_URL>/functions/v1/wa-worker/<operasi>`.
Header: `apikey`, `Authorization` sesuai konfigurasi Muse, `X-Worker-Token`,
dan `Content-Type: application/json`.

| Operasi | Isi request | Respons berhasil |
| --- | --- | --- |
| `claim` | `{"batch_size":10}` | `{"messages":[...]}` |
| `complete` | `id`, `claim_token`, `status`, serta `wa_id`/`error` opsional | `{"ok":true}` |
| `requeue` | `id`, `claim_token`, `error` opsional | `{"ok":true}` |
| `recover` | `{}` | `{"requeued":N}` |

Batch dibatasi 20; lease lima menit; maksimal tiga klaim. `requeued` mengikuti
kontrak Muse: jumlah baris yang dipulihkan **atau ditandai gagal**, bukan hanya
pesan yang kembali pending. Token salah menghasilkan 401, body tidak valid 400,
klaim yang tidak cocok 409, dan kegagalan database 500 tanpa rincian internal.

## Rekonsiliasi saat koneksi terputus

Worker harus menyimpan `id`, `claim_token`, dan `wa_id` secara persisten setelah
pengiriman berhasil, lalu mengulangi `complete` ketika penyimpanan status gagal.
Lakukan rekonsiliasi saat startup dan berkala, termasuk untuk percobaan terakhir;
jangan hanya memeriksa `delivered.json` ketika ada hasil dari `claim`.

Jika lease percobaan terakhir kedaluwarsa, recovery menandai pesan `failed`
dengan `delivery_unknown: lease expired at max attempts` dan mempertahankan
token klaim. Worker dapat memperbaikinya menjadi `sent` melalui `complete`
dengan token yang sama dan `wa_id` dari bukti lokal, tanpa mengirim ulang.
Status ini berarti hasil pengiriman belum pasti, bukan bukti pesan tidak terkirim.
Klaim lama yang sudah diganti tetap ditolak. Pengulangan completion yang sama
untuk pesan sent diterima agar retry HTTP aman.

ID unik mencegah antrean ganda. Pengiriman tepat sekali belum dijamin jika worker
mati setelah WhatsApp menerima pesan tetapi sebelum bukti lokal tersimpan.

## Pembuat laporan dan pengujian

Fungsi `wa-worker` menangani antrean. Pembuat laporan dan jadwal Senin–Jumat
ditangani oleh fungsi PostgreSQL terpisah; lihat
[Laporan WhatsApp harian wali kelas](./whatsapp-laporan-wali-kelas.md).
Tanggal laporan menggunakan WIB dan nomor penerima diambil dari database.

Uji kontrak HTTP tanpa database:

```sh
deno test supabase/functions/wa-worker/handler_test.ts
```

Sebelum mengaktifkan pengiriman, pastikan nomor uji sudah ditentukan, token salah
ditolak, anon/authenticated tidak dapat mengakses tabel/RPC, token klaim lama
ditolak, batas percobaan berlaku, dan rekonsiliasi setelah recovery berhasil.

# Pemasangan worker dan pemulihan laporan WhatsApp

## Insiden 5 Oktober 2026

Pemeriksaan produksi pukul 17.38 WIB menunjukkan cron berhasil membuat 20
laporan pukul 17.00 WIB. Kelas 6A dan 6C berstatus `sent` dengan ID WhatsApp;
18 laporan lainnya berstatus `failed` setelah tiga klaim dengan pesan
`delivery_unknown: lease expired at max attempts`. Status ini belum membuktikan
pesan tidak terkirim. Bukti worker VPS diperlukan untuk menentukan hasilnya.

Pengelola kemudian mengonfirmasi bahwa akun WhatsApp pengirim terkena blokir
saat kejadian. Error lease merupakan akibat tidak selesainya proses worker;
cron dan pembuatan laporan sudah berhasil. Pengelola juga mengatur jeda kirim
lima menit di Muse. Pengiriman dilanjutkan setelah akun pengirim pulih dan
koneksi siap. Penjelasan blokir ini berasal dari pengelola, bukan log VPS yang
sudah diperiksa dalam workspace.

Kode dan akses worker Muse tidak tersedia di workspace Guru Cerdas. Modul
pengganti poller tersedia di `scripts/wa-worker/poller.mjs`; pemasangan pada
proses Baileys yang sudah ada harus dilakukan pengelola VPS.

## Langkah Muse

1. Selama akun pengirim diblokir, hentikan klaim baru dan pastikan adapter
   melaporkan `isReady: false`. Pertahankan laporan untuk pemulihan setelah akun
   bisa digunakan. Hentikan poller lama, pertahankan sesi WhatsApp dan salin journal lama ke
   penyimpanan aman. Periksa log 17.00–17.16 WIB: hasil `sendMessage`, koneksi
   Baileys, restart proses, respons `complete`, dan bukti `delivered.json`.
   Laporan diagnosis harus menyebutkan penyebab yang didukung log.
2. Pastikan migration `harden_wa_delivery` dan Edge Function terbaru sudah
   diterapkan. `claim` hanya memberikan satu pesan, termasuk ketika worker
   lama meminta batch besar. `sent` membutuhkan `wa_id`; lease tetap lima menit
   dan batas tetap tiga klaim. Pembatasan ini tidak menyelesaikan gangguan
   Baileys atau menggantikan pemasangan poller.
3. Integrasikan `createPoller` dengan sesi Baileys yang sudah terhubung.
   Jalankan tepat satu instance; nonaktifkan poller lama sebelum memulai yang
   baru. Jangan membuka sesi pengirim lain untuk pengujian.
4. Impor bukti pengiriman lama ke `DeliveryJournal` sebelum polling dimulai.
   Setiap record berisi `id`, `claim_token`, `state: "delivered"`, dan `wa_id`.
   Token harus berasal dari klaim yang menghasilkan bukti tersebut, bukan
   ditebak. Konflik token diselesaikan melalui rekonsiliasi administrator.
5. Jalankan pemulihan berdasarkan bukti per laporan, kemudian aktifkan poller
   dan pantau penyelesaian seluruh 20 laporan.

## Adapter sesi WhatsApp

Adapter menyediakan `isReady()` dan `send(message, { signal })`.
`isReady` hanya bernilai benar saat koneksi siap. `send` memakai nomor dan teks
dari antrean serta mengembalikan `{ wa_id: result.key.id }` dari hasil Baileys.
Nomor memakai format JID pribadi yang sesuai dengan sesi pengirim.

Poller membatasi proses kirim hingga 30 detik dan memberi abort signal saat
waktu habis. Adapter harus menghentikan atau mereset koneksi yang macet sesuai
kemampuan versi Baileys yang terpasang; jangan menganggap abort signal sendiri
membatalkan pengiriman yang sudah diterima WhatsApp. Jika promise belum selesai,
poller tetap memantau dan merekonsiliasi tetapi menahan klaim baru agar tidak
memulai pengiriman paralel. Bukti yang datang setelah timeout tetap disimpan
dan dikonfirmasi tanpa mengirim ulang.

Penolakan proses kirim ditahan sebagai hasil belum pasti secara default.
Adapter boleh menandai error `deliveryNotAttempted: true` hanya jika pengiriman
benar-benar belum dimulai; pesan tetap ditahan untuk review sebelum retry.
Gangguan konfirmasi HTTP mengulang `complete`, bukan `send`.

Contoh integrasi dalam proses Muse:

```js
import { createPoller, createWorkerApi, DeliveryJournal } from './poller.mjs';

const poller = createPoller({
  api: createWorkerApi({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    token: process.env.WA_WORKER_TOKEN,
  }),
  transport: existingWhatsAppAdapter,
  journal: new DeliveryJournal(process.env.WA_STATE_DIRECTORY),
});

await poller.tick();
```

Panggil `tick()` setiap lima detik untuk pemantauan dan rekonsiliasi. Pengiriman
pesan berikutnya tetap dijeda lima menit setelah proses kirim sebelumnya selesai.
Jeda terjadi sebelum `claim`; setelah klaim, kirim segera agar lease lima menit
tidak habis saat menunggu. Waktu kirim disimpan dalam journal, sehingga restart
tidak menghilangkan sisa jeda. Panggilan bertumpuk memakai pekerjaan yang
sama. Journal harus berada di volume persisten dengan hak akses hanya untuk
worker. Journal menyimpan token klaim dan bukti, tanpa nomor penerima atau teks
laporan. Kegagalan penyimpanan menghentikan klaim baru. Journal tidak dihapus
saat restart atau deploy.

Alternatif runner Node.js memakai adapter berupa module:

```sh
node scripts/wa-worker/run.mjs
```

Environment wajib: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WA_WORKER_TOKEN`,
`WA_TRANSPORT_MODULE` (lokasi adapter), dan `WA_STATE_DIRECTORY`. Gunakan Node.js
20 atau lebih baru. Simpan secrets pada konfigurasi VPS, bukan `VITE_*`, repo,
log, atau percakapan. Runner tidak membuat sesi WhatsApp; adapter menyambungkan
sesi yang dikelola Muse.

## Manifest pemulihan administrator

Simpan manifest di luar repo. Gunakan ID laporan asli dari database dan salah
satu hasil berikut:

- `sent`: ada `wa_id` serta referensi bukti yang cocok dengan laporan dan tujuan.
- `not_sent`: ada bukti positif pengiriman belum terjadi; ketiadaan journal saja
  tidak cukup. Periksa semua tiga percobaan klaim dan proses pengirim.
- `unknown`: belum cukup bukti; status dan percobaan tetap dipertahankan.

```json
[
  {
    "id": "laporan-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-2026-10-05",
    "outcome": "sent",
    "wa_id": "receipt-from-reviewed-worker-evidence",
    "evidence": "Referensi journal dan log yang telah diperiksa"
  }
]
```

Contoh tersebut memakai ID sintetis dan harus diganti dengan bukti nyata.
Pratinjau melakukan pembacaan saja:

```sh
node scripts/reconcile-wa-reports.mjs --project-ref fddvcyqbfqydvsfujcxd --date 2026-10-05 --evidence /secure/reports-2026-10-05.json
```

Setelah semua poller dihentikan dan bukti diperiksa, tambahkan `--apply
--worker-stopped`. CLI memakai `SUPABASE_ACCESS_TOKEN` pada mesin administrator,
bukan pada VPS worker. Operasi mengunci laporan dalam satu transaksi,
memeriksa kembali jumlah status dari preflight, menyimpan status sebelumnya
dan referensi bukti pada tabel audit ber-RLS, lalu memverifikasi hasil.

Laporan `sent` yang sudah ada tidak ditimpa. Bukti `sent` untuk klaim lama dapat
direkonsiliasi administrator dengan token database saat ini. Laporan yang
terbukti `not_sent` kembali `pending` dengan attempts nol dan ID, nomor, serta
teks yang sama. Laporan `unknown` ditahan. `sent_at` yang sebelumnya kosong
mencatat waktu rekonsiliasi, bukan waktu pengiriman historis yang belum diketahui.

## Pemantauan dan penerimaan

Endpoint `POST /wa-worker/health` memakai autentikasi worker yang sama dan hanya
memberikan jumlah status. Pemantauan memakai jeda lima menit per pesan dengan
toleransi sepuluh menit. Mulai 17.10 WIB pada Senin–Jumat, `needs_attention: true`
berarti ada laporan gagal/belum dibuat atau pengiriman tertinggal dari jumlah
yang seharusnya selesai saat pemeriksaan (`expected_sent_by_now`). Dua puluh
laporan memerlukan sedikitnya 95 menit dari kiriman pertama sampai terakhir;
jika mulai 17.00 WIB, batas selesai dengan toleransi adalah 18.45 WIB
(`completion_deadline_wib`). Selama akun diblokir, kegagalan tetap memicu
peringatan. Poller memeriksa setiap
menit dan menulis event `daily_report_overdue`. Hubungkan stderr dan event ini
ke pemantauan layanan VPS; jika worker mati, pemantauan eksternal tetap perlu
memanggil endpoint tersebut. Jangan memakai endpoint `claim` sebagai health check.

Monitor independen memakai `node scripts/check-wa-delivery.mjs` dengan tiga
environment kredensial worker. Exit code 0 berarti belum ada laporan tertunda
yang melewati jadwal, 1 berarti laporan belum selesai, dan 2 berarti pemeriksaan
gagal. Pasang pemeriksaan pada scheduler pemantauan VPS yang terpisah dari
poller; contoh cron UTC `* 10-12 * * 1-5` memeriksa setiap menit pukul
17.00–19.59 WIB. Hubungkan exit code 1/2 ke mekanisme peringatan Muse yang sudah
ada agar worker yang mati tetap terdeteksi.

Penerimaan insiden: 20 laporan memiliki hasil yang dibuktikan, seluruhnya
`sent` setelah pemulihan, dan pemeriksaan log/percakapan membuktikan tidak ada
pesan ganda. ID unik dan journal mengurangi risiko duplikasi; crash setelah
WhatsApp menerima pesan sebelum journal tersimpan masih dapat menghasilkan
hasil belum pasti yang harus diperiksa manual.

Pengujian lokal:

```sh
npm run test:wa-worker
deno test supabase/functions/wa-worker/handler_test.ts
```

Validasi SQL tambahan tersedia di `migration.node-test.mjs`. Set
`PGLITE_MODULE` ke berkas module PGlite yang sudah dipasang untuk menjalankannya;
tanpa environment tersebut pengujian SQL dilewati secara eksplisit.
CI menjalankan `test:wa-worker` sebelum pengujian Vitest.

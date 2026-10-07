# Laporan WhatsApp lewat Baileys di VPS sendiri

Dua layanan berjalan di VPS yang sama:

| Layanan | Isi | Tugas |
| --- | --- | --- |
| `guru-cerdas-wa` | Sesi Baileys, `http://127.0.0.1:3001` | Tersambung ke WhatsApp dan mengirim satu pesan per permintaan. |
| `guru-cerdas-poller` | `scripts/wa-worker` dari repo ini | Mengambil laporan dari antrean Supabase (`wa_outbox`) lalu meneruskannya ke `guru-cerdas-wa`. |

VPS **menarik** pesan dari Supabase. Tidak ada port yang perlu dibuka ke internet, dan web di Vercel tidak terlibat dalam laporan wali kelas.

## Aturan pengiriman (poller)

- Satu pesan sekali kirim, dengan jeda acak **4–7 menit** antar pesan. Jeda dipilih sekali per pesan dan disimpan di journal, jadi tetap berlaku setelah restart.
- Hanya mengirim antara **06.00 dan 21.00 WIB**.
- Laporan dari hari yang sudah lewat ditandai `expired: report day has passed`, tidak dikirim terlambat.
- Poller hanya mengambil pesan kalau `GET /status` menjawab `{"connected": true}`.
- Bukti kirim (`key.id` dari Baileys) disimpan di journal (`WA_STATE_DIRECTORY`) sebelum dilaporkan ke Supabase. Kalau hasil kirim tidak pasti, pesan **tidak** dikirim ulang.

## Kontrak layanan `guru-cerdas-wa`

- `GET /status` → `{"connected": true|false}`
- `POST /send` dengan body `{"phone","message"}` → `{"ok":true,"id":"<key.id>"}`, atau `{"ok":false,"notAttempted":true}` kalau tidak ada yang sampai ke WhatsApp
- Semua permintaan memakai header token (default `x-auth-token`).

Adapternya ada di `scripts/wa-worker/http-transport.mjs`.

## Pemasangan

Butuh Node.js 20 atau lebih baru. Contoh di bawah memakai pengguna `agentuser`; sesuaikan dengan VPS-mu.

### 1. Sambungkan WhatsApp

Pakai nomor yang **sudah pernah chat** dengan para wali kelas. Pesan dari nomor yang baru atau jarang dipakai akan ditahan WhatsApp.

```bash
sudo journalctl -u guru-cerdas-wa -f
```

Scan QR yang muncul dari HP: WhatsApp → Perangkat Tertaut. Pastikan `GET /status` menjawab `{"connected": true}`.

### 2. Salin poller

```bash
mkdir -p ~/guru-cerdas-poller/state && chmod 700 ~/guru-cerdas-poller/state
cp <repo>/scripts/wa-worker/{poller.mjs,run.mjs,http-transport.mjs} ~/guru-cerdas-poller/
```

### 3. Buat token worker baru dan file env

```bash
openssl rand -hex 32   # simpan hasilnya sebagai WA_WORKER_TOKEN
```

`~/guru-cerdas-poller/.env` (`chmod 600`):

```ini
SUPABASE_URL=https://fddvcyqbfqydvsfujcxd.supabase.co
SUPABASE_ANON_KEY=<anon key proyek>
WA_WORKER_TOKEN=<token dari openssl>
WA_TRANSPORT_MODULE=/home/agentuser/guru-cerdas-poller/http-transport.mjs
WA_STATE_DIRECTORY=/home/agentuser/guru-cerdas-poller/state
WA_SERVICE_URL=http://127.0.0.1:3001
WA_SERVICE_TOKEN=<token layanan guru-cerdas-wa>
WA_SERVICE_AUTH_HEADER=x-auth-token
```

Masukkan nilai `WA_WORKER_TOKEN` yang sama ke Supabase Dashboard → Edge Functions → Secrets → `WA_WORKER_TOKEN`. Token lama otomatis tidak berlaku. Jangan kirim token lewat chat.

### 4. Jalankan sebagai layanan

`/etc/systemd/system/guru-cerdas-poller.service`:

```ini
[Unit]
Description=Guru Cerdas WhatsApp report poller
After=network-online.target guru-cerdas-wa.service
Wants=network-online.target

[Service]
User=agentuser
WorkingDirectory=/home/agentuser/guru-cerdas-poller
EnvironmentFile=/home/agentuser/guru-cerdas-poller/.env
ExecStart=/usr/bin/node run.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now guru-cerdas-poller
sudo journalctl -u guru-cerdas-poller -f
```

### 5. Pastikan hanya satu pengirim

Cron Fonnte (`wa-fonnte-sender`) harus tetap nonaktif. Kalau keduanya aktif, mereka berebut antrean yang sama.

## Memantau

```sql
select id, status, attempts, wa_id, error, sent_at from public.wa_outbox order by created_at desc limit 25;
select public.worker_delivery_health();
```

Pesan `sent` di database berarti Baileys sudah mengirim dan memberi `key.id`. Pastikan juga di HP pengirim bahwa pesannya centang dua. Kalau pesan hanya centang satu atau jam terus, nomor itu sedang dibatasi WhatsApp.

## Pengujian

```bash
node --test scripts/wa-worker/*.node-test.mjs
```

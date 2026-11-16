# ADR-0001 — Autentikasi Edge Function tanpa verifikasi JWT gateway

- **Status:** Accepted (16 November 2026)
- **Konteks:** `supabase functions deploy ... --no-verify-jwt` melepas verifikasi JWT di
  lapisan gateway Supabase. Ini disengaja untuk function yang dipanggil oleh layar non-browser.
- **Keputusan:** pertahankan `--no-verify-jwt` hanya untuk dua function berikut, dan
  **wajib** auth internal. Function baru tidak boleh memakai flag ini tanpa entri di tabel
  bawah + mekanisme auth internal.

## Tabel trust model

| Function | Caller | Auth internal | Status |
|---|---|---|---|
| `dispatch-push` | Worker/cron + layanan internal | Header `x-internal-secret` dibandingkan dengan `app_config.dispatch_push_secret` (constant-time, `safeEqual`), fallback `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY` | `--no-verify-jwt` dipertahankan |
| `wa-worker` | VPS WhatsApp worker | Header `X-Worker-Token` dibandingkan dengan env `WA_WORKER_TOKEN` (constant-time), 401 bila salah | `--no-verify-jwt` dipertahankan |
| ~~`openrouter`~~ | — | Tidak ada — **folder function tidak pernah ada di repo** | Deploy line dihapus (2026-11-16); `|| true` menyembunyikan kegagalannya sejak dulu |

## Mengapa bukan verifikasi JWT gateway

Caller utama adalah cron (GitHub Actions/Supabase scheduler) dan VPS worker yang tidak
memiliki JWT pengguna. Verifikasi JWT gateway akan memutus mereka, sedangkan
membuat JWT sintetis menambah kompleksitas tanpa menambah keamanan di atas shared secret
yang dibandingkan constant-time.

## Risiko yang diterima

- URL function publik; penolakan bergantung pada kerahasiaan secret
  (`WA_WORKER_TOKEN`, `app_config.dispatch_push_secret`). Keduanya rotasi berkala.
- Shared secret tidak memberi granularitas per-peran — tidak masalah karena kedua
  function adalah tugas sistem, bukan aksi pengguna.

## Konsekuensi / aturan lanjutan

1. Setiap function `--no-verify-jwt` baru wajib punya baris di tabel ini + check secret
   internal constant-time. PR tanpa itu ditolak.
2. Secret disimpan di Supabase secrets / `app_config`, tidak pernah di repo.
3. Kalau caller berubah menjadi browser (punya JWT), hapus flag `--no-verify-jwt`.
4. Referensi: [docs/DB_SCHEMA_DRIFT_2026-11-16.md](../DB_SCHEMA_DRIFT_2026-11-16.md)
   untuk drift schema; review keamanan gateway di
   [reviews/2026-11-16-masukan-strategis.md](../reviews/2026-11-16-masukan-strategis.md) §4.5.

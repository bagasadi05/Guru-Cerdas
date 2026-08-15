-- 20260815000000_telegram_bot_security.sql
--
-- Konfigurasi keamanan bot Telegram Q&A (telegram-webhook):
-- 1. telegram_webhook_secret: secret acak untuk verifikasi header
--    X-Telegram-Bot-Api-Secret-Token dari Telegram. Dibuat sekali;
--    kalau sudah ada, dipertahankan. Juga bisa di-set via env
--    TELEGRAM_WEBHOOK_SECRET (env menang).
--
-- Idempotent.

insert into public.app_config (key, value)
values (
  'telegram_webhook_secret',
  md5(random()::text || clock_timestamp()::text)
)
on conflict (key) do nothing;

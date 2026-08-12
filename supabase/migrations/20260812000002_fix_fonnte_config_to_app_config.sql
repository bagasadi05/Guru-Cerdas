-- 20260812000002_fix_fonnte_config_to_app_config.sql
-- Memindahkan config Fonnte dari user_settings (per-user, tidak reliable)
-- ke app_config (global, sudah ada security definer set/get).
-- Ini juga fix bug: nomor WA admin tereset setelah deploy Vercel.

-- Update RPC get_fonnte_config — baca dari app_config, bukan user_settings
CREATE OR REPLACE FUNCTION public.get_fonnte_config()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT value::jsonb FROM public.app_config WHERE key = 'fonnte_config'),
    '{}'::jsonb
  );
$$;

-- Migrate existing config dari user_settings admin pertama (jika ada) ke app_config
INSERT INTO public.app_config (key, value)
SELECT 'fonnte_config', fonnte_config::text
FROM public.user_settings
WHERE fonnte_config IS NOT NULL
  AND fonnte_config::jsonb ->> 'adminPhone' IS NOT NULL
  AND fonnte_config::jsonb ->> 'adminPhone' <> ''
  AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (key) DO NOTHING;

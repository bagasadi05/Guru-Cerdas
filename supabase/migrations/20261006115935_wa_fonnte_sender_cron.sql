-- WhatsApp class reports through Fonnte instead of the VPS Baileys poller.
--
-- pg_cron calls the Edge Function wa-fonnte-sender every 5 minutes; each call sends at
-- most one message from public.wa_outbox, so 20 reports take about 100 minutes, the
-- pace that worker_delivery_health already expects. The function only sends between
-- 06:00 and 21:00 WIB and does nothing until the FONNTE_TOKEN secret is set.

insert into public.app_config (key, value)
values ('wa_fonnte_sender_url', 'https://fddvcyqbfqydvsfujcxd.supabase.co/functions/v1/wa-fonnte-sender')
on conflict (key) do update set value = excluded.value
where public.app_config.value is null or public.app_config.value = '';

-- Internal secret for pg_cron → Edge Function. Generated once; kept if it already exists.
insert into public.app_config (key, value)
values ('wa_fonnte_sender_secret', md5(random()::text || clock_timestamp()::text) || md5(random()::text))
on conflict (key) do nothing;

do $$
begin
  perform cron.unschedule('wa-fonnte-sender')
  where exists (select 1 from cron.job where jobname = 'wa-fonnte-sender');

  perform cron.schedule(
    'wa-fonnte-sender',
    '*/5 * * * *',
    $cmd$
    select net.http_post(
      url := public.get_app_config('wa_fonnte_sender_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', public.get_app_config('wa_fonnte_sender_secret')
      ),
      body := jsonb_build_object('source', 'pg_cron'),
      timeout_milliseconds := 30000
    )
    where coalesce(public.get_app_config('wa_fonnte_sender_url'), '') <> ''
      and coalesce(public.get_app_config('wa_fonnte_sender_secret'), '') <> '';
    $cmd$
  );
end;
$$;

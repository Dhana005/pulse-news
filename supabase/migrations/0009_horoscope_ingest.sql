-- Daily rasi palan ingestion (see supabase/functions/ingest-horoscope) —
-- runs once a day since the source only refreshes daily, unlike news.
-- 00:30 UTC = 6:00 AM IST, so it's ready before most readers check in.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose.

select cron.schedule(
  'horoscope-ingest',
  '30 0 * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest-horoscope',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingest-secret', 'REPLACE_WITH_INGEST_SECRET',
      'Authorization', 'Bearer sb_publishable_9EikUSCcn46yHDxlUOgU0w_8f5S8gaC'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

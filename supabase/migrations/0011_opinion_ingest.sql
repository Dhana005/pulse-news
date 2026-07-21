-- Editor's Picks ingestion (see supabase/functions/ingest-opinion) — runs
-- every 2 hours since both sources (Vikatan editorial column, Oneindia
-- fact-checks) publish at most a few times a week, not continuously.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose.

select cron.schedule(
  'opinion-ingest',
  '0 */2 * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest-opinion',
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

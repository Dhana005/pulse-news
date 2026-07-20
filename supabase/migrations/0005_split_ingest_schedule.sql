-- Splits ingestion into two cadences: RSS (no rate limit) runs every
-- 15 minutes; NewsData.io (free tier ~200 req/day, 4 req/run) stays hourly
-- to keep a safe budget. Requires the Edge Function to already support
-- ?skipRss / ?skipNewsData query params.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose.

select cron.schedule(
  'rss-ingest',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest?skipNewsData=true',
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

select cron.schedule(
  'newsdata-ingest',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest?skipRss=true',
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

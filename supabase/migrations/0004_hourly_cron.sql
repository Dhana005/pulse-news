-- NewsData.io's free tier is ~200 requests/day and the ingestion function
-- now makes 4 NewsData requests per run. Every 30 minutes (48 runs/day)
-- would burn 192 credits/day on that alone, leaving no headroom. Hourly
-- (24 runs/day = 96 credits/day) keeps a safe margin. RSS sources are
-- unaffected (no rate limit) — this is purely to protect the NewsData budget.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose.

select cron.schedule(
  'rss-ingest',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest',
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

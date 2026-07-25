-- The ai_summary Gemini step (added after 0012_ai_summary.sql) made the
-- ingest function's NewsData.io runs routinely take 20-50s, sometimes
-- exceeding the 30s net.http_post timeout these two jobs were scheduled
-- with in 0005_split_ingest_schedule.sql. pg_cron gives up waiting before
-- the function finishes writing results on those runs, so some articles'
-- ai_summary silently never gets generated until a later cycle happens to
-- run fast enough. Raised to comfortably cover the worst observed run
-- (~50s) with margin.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose, same
-- as 0005_split_ingest_schedule.sql.

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'rss-ingest'),
  command := $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest?skipNewsData=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingest-secret', 'REPLACE_WITH_INGEST_SECRET',
      'Authorization', 'Bearer sb_publishable_9EikUSCcn46yHDxlUOgU0w_8f5S8gaC'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
  $$
);

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'newsdata-ingest'),
  command := $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ingest?skipRss=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingest-secret', 'REPLACE_WITH_INGEST_SECRET',
      'Authorization', 'Bearer sb_publishable_9EikUSCcn46yHDxlUOgU0w_8f5S8gaC'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
  $$
);

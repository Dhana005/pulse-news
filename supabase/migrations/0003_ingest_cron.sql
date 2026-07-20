-- Schedules the RSS ingestion Edge Function (supabase/functions/ingest) to
-- run every 30 minutes via pg_cron + pg_net, entirely inside Supabase —
-- independent of whether the Next.js app is deployed or running anywhere.
--
-- Prerequisite: the "ingest" Edge Function must already be deployed
-- (Dashboard -> Edge Functions -> Deploy a new function) with its
-- INGEST_SECRET secret set to match the value substituted below.
--
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'rss-ingest',
  '*/30 * * * *',
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

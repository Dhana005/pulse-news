-- Moves ai_summary generation from synchronous per-article Gemini calls
-- (one HTTP request per article at ingest time) to Gemini's Batch API,
-- which is 50% cheaper for both input and output tokens. Batch jobs are
-- asynchronous — submit now, results ready later (verified empirically:
-- ~90s for a 2-item test batch, target SLA up to 24h for larger ones) — so
-- this needs its own tracking state instead of blocking the ingest request.
--
-- ai_summary_batch_name marks a row as "already submitted, awaiting batch
-- results" so the submission step doesn't resubmit it every cycle. Cleared
-- back to null once the batch completes (success -> ai_summary filled in;
-- failure -> eligible for resubmission next cycle).
alter table articles add column if not exists ai_summary_batch_name text;

create table if not exists ai_summary_batches (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  request_count int not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_summary_batches_status_idx on ai_summary_batches (status);
create index if not exists articles_ai_summary_batch_name_idx on articles (ai_summary_batch_name) where ai_summary_batch_name is not null;

-- Runs every 10 minutes — decoupled from the RSS (15 min) / NewsData
-- (hourly) ingest cadences, since batch polling is its own concern.
-- Replace REPLACE_WITH_INGEST_SECRET with the real INGEST_SECRET value
-- (from .env.local) before running — not committed here on purpose, same
-- pattern as the ingest cron jobs.
select cron.schedule(
  'ai-summary-batch',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://bzjcenxqanzrezviqnsw.supabase.co/functions/v1/ai-summary-batch',
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

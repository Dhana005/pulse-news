-- Reliable recurring trigger for editorial draft generation (see
-- src/lib/ingest/editorial.ts). A Claude Code cloud-agent routine was
-- tried first but failed every run — that environment's network sandbox
-- blocks arbitrary outbound HTTP entirely (403 policy denial reaching
-- pulsenewscast.com), and there's no available way to allowlist it.
-- pg_cron/pg_net has normal internet access, matching every other ingest
-- cron already running in this project.
--
-- Calls the Next.js API route directly (not a Supabase Edge Function like
-- the other crons — this one lives in the Vercel app), authenticated with
-- the same x-admin-password header /admin/drafts itself uses.
--
-- Replace REPLACE_WITH_ADMIN_PASSWORD with the real POSTER_ADMIN_PASSWORD
-- value (from .env.local) before running — not committed here on purpose,
-- same pattern as the ingest cron jobs.
select cron.schedule(
  'editorial-draft-generate',
  '0 */4 * * *',
  $$
  select net.http_post(
    url := 'https://www.pulsenewscast.com/api/admin/drafts/generate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-password', 'REPLACE_WITH_ADMIN_PASSWORD'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

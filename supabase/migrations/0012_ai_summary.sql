-- Gemini-rewritten (and translated, when the source dek isn't Tamil)
-- version of an aggregated article's description. Generated once at ingest
-- time (src/lib/ingest/run.ts and supabase/functions/ingest) and displayed
-- on the article page instead of a link out to the publisher. Null until
-- generated, or if GEMINI_API_KEY isn't configured — the page falls back to
-- the raw dek in that case.
alter table articles add column if not exists ai_summary text;

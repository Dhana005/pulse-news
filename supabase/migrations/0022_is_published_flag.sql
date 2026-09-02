-- Site-wide switch (2026-09-02): the automatic RSS/NewsData/YouTube ingest
-- pipeline keeps running (it feeds src/lib/ingest/editorial.ts's multi-
-- source synthesis), but nothing it inserts should be visible on the site
-- anymore — only articles that went through actual human review via
-- /admin/drafts. Reversible: existing auto-ingested rows are hidden, not
-- deleted, and can be re-shown by flipping this flag if the policy ever
-- changes.
--
-- Default false covers every future auto-ingest insert (run.ts, video.ts,
-- opinion.ts) automatically, with no code change needed there. Only
-- src/app/api/admin/drafts/[id]/route.ts's approve action ever sets this
-- true, on insert.
alter table articles add column if not exists is_published boolean not null default false;

-- Retroactively publish the articles that already went through human
-- review (tagged 'editorial' by the approve action — see that route).
update articles set is_published = true where 'editorial' = any(tags) and is_published = false;

-- Partial indexes, not composite-over-everything ones: is_published = true
-- matches a tiny fraction of this table (dozens vs. tens of thousands), so
-- a partial index stays small and fast regardless of how large the hidden
-- majority grows. Covers every current published-only query shape in
-- src/lib/data.ts.
create index if not exists articles_published_category_idx
  on articles (category_key, published_at desc) where is_published = true;
create index if not exists articles_published_recent_idx
  on articles (published_at desc) where is_published = true;
create index if not exists articles_published_mostread_idx
  on articles (view_count desc, published_at desc) where is_published = true;
create index if not exists articles_published_video_idx
  on articles (has_video, published_at desc) where is_published = true;

-- Editorial draft queue: AI drafts a genuinely original piece synthesizing
-- multiple sources' coverage of the same real-world story, but nothing here
-- ever reaches `articles` (and therefore the live site) without a human
-- reviewing and approving it via /admin/drafts. Separate from `articles`
-- rather than a status column on it — drafts are a fundamentally different
-- kind of row (pending human review, not yet real content) and keeping them
-- apart means the existing auto-publish ingest pipeline can't accidentally
-- treat one as a normal article.
create table if not exists editorial_drafts (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  category_key text not null references categories(key) on delete restrict,
  content_type text not null default 'news' check (content_type in ('news', 'cinema')),
  body text[] not null default '{}',
  -- [{ "name": "Oneindia Tamil", "url": "https://...", "headline": "..." }, ...]
  -- for the same reasoning as `articles.source_url` — attributing what this
  -- draft was synthesized from, shown on the published article.
  source_refs jsonb not null default '[]',
  -- Traceability back to the specific articles rows this draft was
  -- synthesized from, not used for display.
  source_article_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_article_id uuid references articles(id)
);

create index if not exists editorial_drafts_status_idx on editorial_drafts (status, created_at desc);

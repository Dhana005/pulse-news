-- Powers the homepage "most read" widget. Incremented via the service-role
-- client in src/app/api/track-view/route.ts, never written to directly by
-- the anon key, so no RLS write policy is needed.
alter table articles add column if not exists view_count int not null default 0;

create index if not exists articles_view_count_idx on articles (view_count desc);

create or replace function increment_article_view(p_category text, p_slug text)
returns void
language sql
as $$
  update articles set view_count = view_count + 1
  where category_key = p_category and slug = p_slug;
$$;

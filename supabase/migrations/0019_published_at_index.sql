-- Root cause of the recurring "canceling statement due to statement
-- timeout" build failures seen throughout 2026-09-02, across many
-- unrelated pages (rss.xml, news-sitemap.xml, and multiple /ta/[category]
-- pages) — all share one ingredient: getTrending() and getHeroFeed() in
-- data.ts both run `ORDER BY published_at DESC LIMIT N` with no category
-- filter, and the only existing index on published_at is the composite
-- articles_category_published_idx (category_key, published_at desc), which
-- can't serve a category-agnostic sort. Every page using the trending
-- sidebar or hero feed widget (nearly all of them) hit this.
create index if not exists articles_published_at_idx on articles (published_at desc);

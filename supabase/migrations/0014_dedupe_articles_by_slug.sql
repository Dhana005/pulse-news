-- The unique constraint was (category_key, slug), which let the same
-- underlying article get inserted more than once when different feed
-- queries classified it into different categories (most commonly
-- NewsData.io's "top" query, mapped to tamilnadu, overlapping with its own
-- business/technology/sports/cinema category queries, and occasionally
-- with Vikatan RSS's own classification of the same syndicated story).
-- Found via Search Console flagging "Duplicate without user-selected
-- canonical" — 762 duplicate groups / 786 redundant rows existed at
-- migration time. slug alone (a hash of the source URL) is the article's
-- real identity; category_key should never have been part of the
-- uniqueness key.
--
-- Keeps the earliest-published row per slug as canonical, records a
-- redirect for every other (category_key, slug) pairing that pointed at a
-- duplicate, deletes the duplicates, then fixes the constraint so this
-- can't recur. src/lib/data.ts's getArticleRedirect + the article page
-- consult this table when a (category, slug) URL no longer resolves.

create table if not exists article_redirects (
  category_key text not null,
  slug text not null,
  canonical_category_key text not null,
  canonical_slug text not null,
  created_at timestamptz not null default now(),
  primary key (category_key, slug)
);

with ranked as (
  select id, slug, category_key,
    row_number() over (partition by slug order by published_at asc, id asc) as rn
  from articles
),
canonical as (
  select slug, category_key from ranked where rn = 1
)
insert into article_redirects (category_key, slug, canonical_category_key, canonical_slug)
select losing.category_key, losing.slug, canonical.category_key, losing.slug
from ranked losing
join canonical on canonical.slug = losing.slug
where losing.rn > 1
on conflict (category_key, slug) do nothing;

delete from articles a
using (
  select id from (
    select id, row_number() over (partition by slug order by published_at asc, id asc) as rn
    from articles
  ) x where x.rn > 1
) losing
where a.id = losing.id;

alter table articles drop constraint articles_category_key_slug_key;
alter table articles add constraint articles_slug_key unique (slug);

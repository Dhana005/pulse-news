-- Pulse News v1 schema: content_type-aware so news, cinema, and evergreen
-- content (horoscope) all flow through one ingestion-friendly shape,
-- per the product plan (language column baked in for future non-Tamil editions).

create extension if not exists "pgcrypto";

create table if not exists categories (
  key text primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  category_key text not null references categories(key) on delete restrict,
  content_type text not null default 'news' check (content_type in ('news', 'cinema')),
  language text not null default 'ta',
  headline text not null,
  dek text,
  body text[] not null default '{}',
  source text,
  author text,
  published_at timestamptz not null default now(),
  has_video boolean not null default false,
  video_url text,
  image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (category_key, slug)
);

create index if not exists articles_category_published_idx
  on articles (category_key, published_at desc);

create table if not exists horoscopes (
  id uuid primary key default gen_random_uuid(),
  rashi_key text not null,
  rashi_name text not null,
  reading_date date not null default current_date,
  reading_text text not null,
  sort_order int not null default 0,
  unique (rashi_key, reading_date)
);

create index if not exists horoscopes_date_idx on horoscopes (reading_date);

alter table categories enable row level security;
alter table articles enable row level security;
alter table horoscopes enable row level security;

-- Public, read-only site: anon key may select; writes happen only via the
-- service role key (seed script now, ingestion cron/Edge Functions later).
create policy "categories are publicly readable" on categories
  for select using (true);

create policy "articles are publicly readable" on articles
  for select using (true);

create policy "horoscopes are publicly readable" on horoscopes
  for select using (true);

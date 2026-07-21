-- Email capture for the homepage newsletter signup. Write-only via the
-- service-role client in src/app/api/newsletter/route.ts — no public
-- select/insert policy, matching the ingest write path's pattern.
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

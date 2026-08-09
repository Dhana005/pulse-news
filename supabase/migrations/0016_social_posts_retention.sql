-- social_posts/social_channels power a Telegram auto-posting workflow that
-- lives outside this repo (not created by any earlier migration here) — this
-- just adds retention so the log table doesn't grow unbounded. At the time
-- of writing it was ~1,600 rows/day with no cleanup, which extrapolates to
-- ~580k rows/year.
--
-- Keeps 30 days of history (enough to debug recent posting failures),
-- pruned daily. Index supports both the cleanup query itself and any
-- future "recent failures" dashboard query.

create index if not exists social_posts_status_created_at_idx
  on social_posts (status, created_at);

select cron.schedule(
  'social-posts-cleanup',
  '0 3 * * *',
  $$ delete from social_posts where created_at < now() - interval '30 days'; $$
);

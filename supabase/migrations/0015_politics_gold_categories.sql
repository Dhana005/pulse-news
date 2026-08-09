-- Adds politics/gold categories — see src/lib/categories.ts,
-- src/lib/ingest/newsdata.ts (politics, via NewsData.io's own "politics"
-- category, checked before "top" so it wins the dedup) and
-- src/lib/ingest/sources.ts (gold, via Oneindia Tamil RSS's "gold-rate"
-- item category tag).
insert into categories (key, label, sort_order) values
  ('politics', 'அரசியல்', 9),
  ('gold', 'தங்கம் விலை', 10)
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

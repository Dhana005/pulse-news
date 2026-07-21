-- Adds business/technology/lifestyle categories (homepage redesign), sourced
-- via NewsData.io only — see src/lib/ingest/newsdata.ts.
insert into categories (key, label, sort_order) values
  ('business', 'வணிகம்', 6),
  ('technology', 'தொழில்நுட்பம்', 7),
  ('lifestyle', 'லைஃப் ஸ்டைல்', 8)
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

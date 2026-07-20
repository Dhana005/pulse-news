-- Aggregated articles link out to the publisher rather than republishing
-- full text (copyright + Google News compliance, per product plan). This
-- column distinguishes ingested/aggregated rows (source_url set, body empty)
-- from any future owned/authored content (source_url null, body populated).

alter table articles add column if not exists source_url text;

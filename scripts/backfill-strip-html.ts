// One-off cleanup: NewsData.io descriptions ingested before the stripHtml()
// fix (see src/lib/ingest/newsdata.ts) were stored with raw HTML markup in
// `dek`/`headline`. Re-strips those already-stored rows — the code fix only
// prevents new rows from having this problem, it doesn't touch old ones.
// Run with: npx tsx scripts/backfill-strip-html.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { stripHtml } from "../src/lib/ingest/parse";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const { data: rows, error } = await supabase
    .from("articles")
    .select("id, headline, dek")
    .or("dek.ilike.%<%,headline.ilike.%<%");
  if (error) throw error;

  const candidates = (rows ?? []).filter(
    (row) => /<[a-zA-Z/]/.test(row.dek ?? "") || /<[a-zA-Z/]/.test(row.headline ?? ""),
  );
  console.log(`Found ${candidates.length} row(s) with HTML markup.`);

  let fixed = 0;
  for (const row of candidates) {
    const cleanHeadline = stripHtml(row.headline ?? "");
    const cleanDek = stripHtml(row.dek ?? "");
    const { error: updateError } = await supabase
      .from("articles")
      .update({ headline: cleanHeadline, dek: cleanDek })
      .eq("id", row.id);
    if (updateError) {
      console.log(`✗ ${row.id}: ${updateError.message}`);
      continue;
    }
    fixed += 1;
    console.log(`✓ ${row.id}: ${cleanHeadline.slice(0, 60)}`);
  }

  console.log(`\nFixed ${fixed}/${candidates.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

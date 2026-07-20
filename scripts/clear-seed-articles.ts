// One-off: removes placeholder articles inserted by scripts/seed.ts, now
// that real ingested content exists. Seed rows are identifiable because
// they have no source_url (real ingested articles always do).
// Run with: npx tsx scripts/clear-seed-articles.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { error, count } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .is("source_url", null);
  if (error) throw error;
  console.log(`Deleted ${count} placeholder articles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

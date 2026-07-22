// One-off backfill: generates a fallback illustration for every existing
// article that has no image_url, using the same generateFallbackImage()
// path new ingestion uses (src/lib/ingest/run.ts). Costs real money per
// image (Gemini gemini-3.1-flash-lite-image, ~$0.03/image) — confirm the
// row count before running.
// Run with: npx tsx scripts/backfill-generate-images.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { ensureArticleImageBucket, generateFallbackImage, uploadArticleImage } from "../src/lib/ingest/images";

const CONCURRENCY = 3;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in .env.local.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  await ensureArticleImageBucket(supabase);

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, category_key, headline")
    .is("image_url", null);
  if (error) throw error;
  const rows = data ?? [];

  console.log(`Backfilling ${rows.length} article(s)...\n`);

  let next = 0;
  let done = 0;
  let failed = 0;

  async function worker() {
    while (next < rows.length) {
      const row = rows[next++];
      const image = await generateFallbackImage(row.headline, row.category_key);
      if (!image) {
        failed += 1;
        console.log(`✗ ${row.id}: generation failed — ${row.headline.slice(0, 50)}`);
        continue;
      }
      const publicUrl = await uploadArticleImage(supabase, `${row.category_key}-${row.slug}`, image);
      if (!publicUrl) {
        failed += 1;
        console.log(`✗ ${row.id}: upload failed — ${row.headline.slice(0, 50)}`);
        continue;
      }
      const { error: updateError } = await supabase
        .from("articles")
        .update({ image_url: publicUrl })
        .eq("id", row.id);
      if (updateError) {
        failed += 1;
        console.log(`✗ ${row.id}: ${updateError.message}`);
        continue;
      }
      done += 1;
      console.log(`✓ (${done + failed}/${rows.length}) ${row.headline.slice(0, 60)}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));

  console.log(`\nDone: ${done} succeeded, ${failed} failed, out of ${rows.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-time backfill: generates a Gemini fallback image for existing
// articles with image_url = null. The Gemini image-fallback step
// (src/lib/ingest/images.ts) only ever ran in the Next.js /api/ingest path,
// which isn't on any live schedule (pg_cron calls the Supabase edge
// functions directly) — it was just added to those edge functions, but
// existing articles that already aged out of their RSS/NewsData feed's
// live window will never be revisited naturally. Safe to re-run — only
// targets rows where image_url is still null.
// Run with: npx tsx scripts/backfill-images.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { ensureArticleImageBucket, generateFallbackImage, uploadArticleImage } from "../src/lib/ingest/images";

config({ path: ".env.local" });

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
const CONCURRENCY = 4;
const PAGE_SIZE = 200;

interface Row {
  id: string;
  slug: string;
  category_key: string;
  headline: string;
}

async function fetchBatch(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,category_key,headline")
    .is("image_url", null)
    .limit(PAGE_SIZE);
  if (error) throw error;
  return data ?? [];
}

async function main() {
  await ensureArticleImageBucket(supabase);

  let totalDone = 0;
  let totalFailed = 0;
  const startedAt = Date.now();

  for (;;) {
    const batch = await fetchBatch();
    if (batch.length === 0) break;

    let next = 0;
    async function worker() {
      while (next < batch.length) {
        const row = batch[next++];
        const image = await generateFallbackImage(row.headline, row.category_key);
        // On failure, write "" rather than leaving image_url null — an empty
        // string still fails the `is("image_url", null)` filter above (so
        // this loop makes forward progress instead of retrying the same
        // permanently-failing row forever), while ArticleMedia's `!imageUrl`
        // check treats "" exactly like null, so display is unaffected. A
        // future ingest cycle can still retry it naturally, since that
        // pipeline's own candidate filter treats "" as falsy too.
        const imageUrl = image ? await uploadArticleImage(supabase, `${row.category_key}-${row.slug}`, image) : null;
        const { error } = await supabase.from("articles").update({ image_url: imageUrl ?? "" }).eq("id", row.id);
        if (error) {
          totalFailed++;
          console.error(`update failed for ${row.id}: ${error.message}`);
        } else if (imageUrl) {
          totalDone++;
        } else {
          totalFailed++;
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const elapsedS = Math.round((Date.now() - startedAt) / 1000);
    console.log(`progress: ${totalDone} done, ${totalFailed} failed, ${elapsedS}s elapsed`);
  }

  console.log(`Done. ${totalDone} generated, ${totalFailed} failed.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

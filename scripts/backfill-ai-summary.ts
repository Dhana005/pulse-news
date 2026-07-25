// One-time backfill: generates ai_summary for existing articles that
// predate the AI-rewrite feature. The ingest pipeline (src/lib/ingest/run.ts
// and supabase/functions/ingest) only sees each source's latest ~15 RSS/
// NewsData items per run, so articles that have already aged out of that
// window never get revisited and would otherwise stay without an ai_summary
// forever. Safe to re-run — only targets rows where ai_summary is still null.
// Run with: npx tsx scripts/backfill-ai-summary.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { rewriteDescription } from "../src/lib/ingest/aiSummary";

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
const CONCURRENCY = 8;
const PAGE_SIZE = 500;

interface Row {
  id: string;
  headline: string;
  dek: string;
}

async function fetchBatch(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id,headline,dek")
    .not("source_url", "is", null)
    .not("dek", "is", null)
    .neq("dek", "")
    .is("ai_summary", null)
    .limit(PAGE_SIZE);
  if (error) throw error;
  return data ?? [];
}

async function main() {
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
        const summary = await rewriteDescription(row.headline, row.dek);
        // On failure, write "" rather than leaving ai_summary null — an empty
        // string still fails the `is("ai_summary", null)` filter above (so
        // this loop makes forward progress instead of retrying the same
        // permanently-failing row forever), while page.tsx's `aiSummary ||
        // dek` fallback treats "" exactly like null, so display is unaffected.
        // A future ingest cycle can still retry it naturally, since that
        // pipeline's own dedup check treats "" as falsy too.
        const { error } = await supabase.from("articles").update({ ai_summary: summary ?? "" }).eq("id", row.id);
        if (error) {
          totalFailed++;
          console.error(`update failed for ${row.id}: ${error.message}`);
        } else if (summary) {
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

  console.log(`Done. ${totalDone} summarized, ${totalFailed} failed.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

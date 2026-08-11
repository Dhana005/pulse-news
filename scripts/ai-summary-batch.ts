// Manual/local trigger for the AI summary batch cycle (poll + collect any
// in-flight batch, submit a new one if none is in flight).
// Run with: npx tsx scripts/ai-summary-batch.ts
// In production this runs on a schedule via the ai-summary-batch Supabase
// edge function (pg_cron, every 10 min) — see
// supabase/migrations/0017_ai_summary_batching.sql.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { runAiSummaryBatchCycle } from "../src/lib/ingest/aiSummaryBatch";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

runAiSummaryBatchCycle(supabase)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

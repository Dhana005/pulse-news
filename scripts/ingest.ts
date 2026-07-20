// Manual/local trigger for the RSS ingestion pipeline.
// Run with: npm run db:ingest
// In production this runs on a schedule via POST /api/ingest (Vercel Cron).

import { config } from "dotenv";
config({ path: ".env.local" });

import { runIngestion } from "../src/lib/ingest/run";

runIngestion()
  .then(({ upserted, results }) => {
    for (const r of results) {
      if (r.error) {
        console.log(`✗ ${r.url}\n   ${r.error}`);
      } else {
        console.log(`✓ ${r.url} — fetched ${r.fetched}, classified ${r.classified}`);
      }
    }
    console.log(`\nUpserted ${upserted} articles.`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

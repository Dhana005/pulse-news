// Runner for supabase/migrations/*.sql against SUPABASE_DB_URL. Tracks
// applied migrations in a _migrations table so re-running is safe — only
// new files get executed.
// Run with: npm run db:migrate

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL in .env.local.");
  process.exit(1);
}

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      `create table if not exists _migrations (filename text primary key, applied_at timestamptz not null default now())`,
    );
    const { rows } = await client.query<{ filename: string }>(`select filename from _migrations`);
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping ${file} (already applied).`);
        continue;
      }
      console.log(`Applying ${file}...`);
      const sql = readFileSync(join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(`insert into _migrations (filename) values ($1)`, [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

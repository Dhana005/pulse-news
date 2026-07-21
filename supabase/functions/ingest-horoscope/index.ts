// Supabase Edge Function: scrapes daily rasi palan (Tamil horoscope) from
// Oneindia Tamil's per-rashi "today" pages and upserts into `horoscopes`.
// Kept in sync by hand with src/lib/ingest/horoscope.ts (Deno can't import
// the Next.js app's TS directly), same as the `ingest` function.
//
// Runs once a day via pg_cron (see
// supabase/migrations/0009_horoscope_ingest.sql) — rasi palan content only
// refreshes daily at the source, unlike news.
//
// Deploy: paste this file's contents into the Supabase Dashboard's
// Edge Functions editor, or `supabase functions deploy ingest-horoscope`.
// Secrets needed (Functions -> ingest-horoscope -> Secrets): INGEST_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

const RASHIS: { key: string; slug: string }[] = [
  { key: "மேஷம்", slug: "mesham" },
  { key: "ரிஷபம்", slug: "rishabam" },
  { key: "மிதுனம்", slug: "midhunam" },
  { key: "கடகம்", slug: "kadagam" },
  { key: "சிம்மம்", slug: "simmam" },
  { key: "கன்னி", slug: "kanni" },
  { key: "துலாம்", slug: "thulam" },
  { key: "விருச்சிகம்", slug: "viruchigam" },
  { key: "தனுசு", slug: "dhanusu" },
  { key: "மகரம்", slug: "makaram" },
  { key: "கும்பம்", slug: "kumbham" },
  { key: "மீனம்", slug: "meenam" },
];

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDailyReading(slug: string): Promise<string | null> {
  const url = `https://tamil.oneindia.com/astrology/${slug}-rasi-palan-today.html`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const descBlock = html.match(/<div class="desc">([\s\S]*?)<\/div>/);
    if (!descBlock) return null;
    const firstPara = descBlock[1].match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!firstPara) return null;
    const text = stripHtml(firstPara[1]);
    return text.length > 20 ? text : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("INGEST_SECRET");
  const provided = req.headers.get("x-ingest-secret");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const readings = await Promise.all(RASHIS.map(({ slug }) => fetchDailyReading(slug)));

  const results: { rashi: string; ok: boolean }[] = [];
  // deno-lint-ignore no-explicit-any
  const rows: Record<string, any>[] = [];
  RASHIS.forEach(({ key }, i) => {
    const text = readings[i];
    results.push({ rashi: key, ok: Boolean(text) });
    if (text) {
      rows.push({ rashi_key: key, rashi_name: key, reading_date: today, reading_text: text, sort_order: i });
    }
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("horoscopes").upsert(rows, { onConflict: "rashi_key,reading_date" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: rows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

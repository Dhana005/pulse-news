import { createClient } from "@supabase/supabase-js";

// Oneindia Tamil publishes a daily-refreshed page per rashi at a stable URL
// (no date in the path — the content itself updates server-side each day).
// Verified by hand: <div class="desc"> wraps several <p>s, the first being
// the general daily prediction, the rest breaking it down further by
// nakshatra — we only want the first one.
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

export interface HoroscopeIngestResult {
  rashi: string;
  ok: boolean;
}

export async function runHoroscopeIngestion(): Promise<{
  upserted: number;
  results: HoroscopeIngestResult[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(url, serviceKey);

  const today = new Date().toISOString().slice(0, 10);
  const readings = await Promise.all(RASHIS.map(({ slug }) => fetchDailyReading(slug)));

  const results: HoroscopeIngestResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (error) throw error;
  }

  return { upserted: rows.length, results };
}

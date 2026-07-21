import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

// Two real, verified sources for "எடிட்டரின் தேர்வு" (Editor's Picks) — there's
// no single feed for this, so it's assembled from:
//  - Vikatan's editorial.rss, filtered to its "Editorial" category — genuine
//    opinion columns bylined "ஆசிரியர்" (the Editor), published roughly
//    weekly (verified by hand: not daily, so a ~2-week-old latest item here
//    is normal, not stale).
//  - Oneindia Tamil's /fact-check/ listing page (no RSS exists for this
//    section, so it's scraped) — genuine fact-checks, mostly Tamil Nadu
//    specific, published every week or two.

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Same convention as src/lib/ingest/run.ts's slugFor — must stay a plain
// Web Crypto SHA-1 (not Node's `crypto` module) since Deno's Edge Function
// mirror upserts against the same (category_key, slug) unique constraint.
async function slugFor(link: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(link));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

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

interface NormalizedItem {
  title: string;
  link: string;
  published: string;
  imageUrl?: string;
}

const MAX_OPINION_ITEMS = 3;
const MAX_FACTCHECK_ITEMS = 1;

async function fetchVikatanEditorials(): Promise<NormalizedItem[]> {
  const res = await fetch("https://www.vikatan.com/api/v1/collections/editorial.rss", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`vikatan editorial.rss -> HTTP ${res.status}`);
  const xml = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = parser.parse(xml);
  const items = asArray(doc?.rss?.channel?.item);

  return items
    .filter((item: Record<string, unknown>) => item.category === "Editorial")
    .map((item: Record<string, unknown>) => ({
      title: stripHtml(String(item.title ?? "")),
      link: stripHtml(String(item.link ?? "")),
      published: String(item.pubDate ?? new Date().toISOString()),
    }));
}

async function fetchOneindiaFactChecks(): Promise<NormalizedItem[]> {
  const res = await fetch("https://tamil.oneindia.com/fact-check/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`oneindia fact-check -> HTTP ${res.status}`);
  const html = await res.text();

  const items: NormalizedItem[] = [];
  const liBlocks = html.match(/<li class="clearfix"[^>]*>[\s\S]*?<\/li>/g) ?? [];
  for (const block of liBlocks) {
    const titleMatch = block.match(/<div class="oi-article-title"><a[^>]*>([\s\S]*?)<\/a>/);
    const linkMatch = block.match(/<div class="oi-article-title"><a href="([^"]+)"/);
    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
    if (!titleMatch || !linkMatch) continue;
    const link = linkMatch[1].startsWith("http") ? linkMatch[1] : `https://tamil.oneindia.com${linkMatch[1]}`;
    items.push({
      title: stripHtml(titleMatch[1]),
      link,
      published: new Date().toISOString(), // no reliable machine-readable date in the listing markup
      imageUrl: imgMatch?.[1],
    });
  }
  return items;
}

export interface OpinionIngestResult {
  source: string;
  fetched: number;
  error?: string;
}

export async function runOpinionIngestion(): Promise<{ upserted: number; results: OpinionIngestResult[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(url, serviceKey);

  const results: OpinionIngestResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Record<string, any>[] = [];

  try {
    const editorials = await fetchVikatanEditorials();
    for (const item of editorials.slice(0, MAX_OPINION_ITEMS)) {
      rows.push({
        slug: await slugFor(item.link),
        category_key: "india",
        content_type: "news",
        language: "ta",
        headline: item.title,
        dek: null,
        body: [],
        source: "Vikatan",
        source_url: item.link,
        author: "ஆசிரியர் குழு",
        published_at: new Date(item.published).toISOString(),
        has_video: false,
        video_url: null,
        image_url: null,
        tags: ["india", "opinion"],
      });
    }
    results.push({ source: "vikatan-editorial", fetched: editorials.length });
  } catch (err) {
    results.push({ source: "vikatan-editorial", fetched: 0, error: err instanceof Error ? err.message : String(err) });
  }

  try {
    const factChecks = await fetchOneindiaFactChecks();
    for (const item of factChecks.slice(0, MAX_FACTCHECK_ITEMS)) {
      rows.push({
        slug: await slugFor(item.link),
        category_key: "tamilnadu",
        content_type: "news",
        language: "ta",
        headline: item.title,
        dek: null,
        body: [],
        source: "Oneindia Tamil",
        source_url: item.link,
        author: "Oneindia Tamil Fact Check",
        published_at: item.published,
        has_video: false,
        video_url: null,
        image_url: item.imageUrl ?? null,
        tags: ["tamilnadu", "factcheck"],
      });
    }
    results.push({ source: "oneindia-factcheck", fetched: factChecks.length });
  } catch (err) {
    results.push({ source: "oneindia-factcheck", fetched: 0, error: err instanceof Error ? err.message : String(err) });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("articles").upsert(rows, { onConflict: "category_key,slug" });
    if (error) throw error;
  }

  return { upserted: rows.length, results };
}

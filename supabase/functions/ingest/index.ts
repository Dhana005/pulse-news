// Supabase Edge Function: pulls the same Tamil RSS + NewsData.io sources as
// src/lib/ingest (kept in sync by hand — Deno can't import the Next.js
// app's TS directly) and upserts into `articles`.
//
// Two pg_cron schedules hit this on different cadences (see
// supabase/migrations/0005_split_ingest_schedule.sql), because RSS has no
// rate limit but NewsData.io's free tier is ~200 req/day:
//  - every 15 min: ?skipNewsData=true (RSS only)
//  - hourly:        ?skipRss=true      (NewsData only)
//
// Deploy: paste this file's contents into the Supabase Dashboard's
// Edge Functions editor (Functions -> ingest -> redeploy/edit),
// or `supabase functions deploy ingest` if you have the CLI linked.
// Secrets needed (Functions -> ingest -> Secrets): INGEST_SECRET,
// NEWSDATA_API_KEY (optional — NewsData source is skipped if unset).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

type ContentType = "news" | "cinema";

interface FeedSource {
  url: string;
  sourceLabel: string;
  contentType: ContentType;
  classify: (categories: string[]) => string | null;
}

const TN_CITY_TAGS = new Set([
  "chennai", "tamilnadu", "madurai", "tirupati", "coimbatore", "salem",
  "trichy", "tiruchirappalli", "tirunelveli", "vellore", "erode", "thanjavur", "madras",
]);
const NON_INDIA_CITY_TAGS = new Set(["singapore", "dubai", "london", "newyork", "colombo"]);

function classifyOneindia(categories: string[]): string | null {
  for (const raw of categories) {
    const cat = raw.toLowerCase();
    if (cat.startsWith("news/sports")) return "sports";
    if (cat.startsWith("news/international")) return "world";
    if (cat === "news/india") return "india";
    const cityMatch = cat.match(/^news\/([a-z]+)$/);
    if (cityMatch) {
      const city = cityMatch[1];
      if (TN_CITY_TAGS.has(city)) return "tamilnadu";
      if (NON_INDIA_CITY_TAGS.has(city)) return "world";
      return "india";
    }
    if (cat === "news" || cat === "news/tamilnadu") return "tamilnadu";
  }
  return null;
}

const VIKATAN_PERIOD = "time-period=last-7-days";

const FEED_SOURCES: FeedSource[] = [
  { url: `https://www.vikatan.com/api/v1/collections/india-news.rss?&${VIKATAN_PERIOD}`, sourceLabel: "விகடன்", contentType: "news", classify: () => "india" },
  { url: `https://www.vikatan.com/api/v1/collections/international.rss?&${VIKATAN_PERIOD}`, sourceLabel: "விகடன்", contentType: "news", classify: () => "world" },
  { url: `https://www.vikatan.com/api/v1/collections/sports-news.rss?&${VIKATAN_PERIOD}`, sourceLabel: "விகடன்", contentType: "news", classify: () => "sports" },
  { url: `https://www.vikatan.com/api/v1/collections/kollywood-entertainment.rss?&${VIKATAN_PERIOD}`, sourceLabel: "விகடன்", contentType: "cinema", classify: () => "cinema" },
  { url: "https://tamil.oneindia.com/rss/feeds/oneindia-tamil-fb.xml", sourceLabel: "Oneindia Tamil", contentType: "news", classify: classifyOneindia },
];

// NewsData.io's Tamil corpus skews heavily to Tamil Nadu regional sources
// even under category=politics/top — no clean "India national" split, so
// "india" is left to the Vikatan RSS feed above.
interface NewsDataCategoryConfig {
  category: string;
  targetCategory: string;
  contentType: ContentType;
  country?: string;
}
const NEWSDATA_CATEGORIES: NewsDataCategoryConfig[] = [
  { category: "top", targetCategory: "tamilnadu", contentType: "news", country: "in" },
  { category: "sports", targetCategory: "sports", contentType: "news", country: "in" },
  { category: "entertainment", targetCategory: "cinema", contentType: "cinema", country: "in" },
  { category: "world", targetCategory: "world", contentType: "news" },
  { category: "business", targetCategory: "business", contentType: "news", country: "in" },
  { category: "technology", targetCategory: "technology", contentType: "news", country: "in" },
  { category: "lifestyle", targetCategory: "lifestyle", contentType: "news", country: "in" },
];

const MAX_ITEMS_PER_SOURCE = 15;

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// Must match src/lib/ingest/run.ts's slugFor exactly (same Web Crypto API,
// available natively in both Deno and Node) — both paths upsert against the
// same (category_key, slug) unique constraint.
async function slugFor(link: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(link));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

async function fetchRssItems(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const xml = await res.text();
  // deno-lint-ignore no-explicit-any
  const doc: any = xmlParser.parse(xml);
  const items = asArray(doc?.rss?.channel?.item);

  // deno-lint-ignore no-explicit-any
  return items.map((item: Record<string, any>) => {
    const mediaContent = item["media:content"] as { "@_url"?: string } | undefined;
    const mediaThumb = item["media:thumbnail"] as { "@_url"?: string } | undefined;
    const imageUrl = mediaContent?.["@_url"] ?? mediaThumb?.["@_url"] ?? undefined;
    const categories = asArray(item.category as string | string[] | undefined).map((c) => textOf(c).trim());
    return {
      title: stripHtml(textOf(item.title)),
      link: stripHtml(textOf(item.link)),
      description: stripHtml(textOf(item.description)),
      pubDate: textOf(item.pubDate) || undefined,
      imageUrl,
      categories,
    };
  });
}

async function fetchNewsDataItems(apiKey: string, config: NewsDataCategoryConfig) {
  const params = new URLSearchParams({ apikey: apiKey, language: "ta", category: config.category });
  if (config.country) params.set("country", config.country);
  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`);
  if (!res.ok) throw new Error(`newsdata ${config.category} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "success") throw new Error(`newsdata ${config.category} -> ${JSON.stringify(json)}`);
  // deno-lint-ignore no-explicit-any
  return (json.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    description: r.description ?? "",
    pubDate: r.pubDate ?? undefined,
    imageUrl: r.image_url ?? undefined,
    sourceName: r.source_name ?? "NewsData",
  }));
}

// deno-lint-ignore no-explicit-any
async function buildRow(item: any, category: string, contentType: ContentType, sourceLabel: string) {
  return {
    slug: await slugFor(item.link),
    category_key: category,
    content_type: contentType,
    language: "ta",
    headline: item.title,
    dek: item.description || item.title,
    body: [],
    source: sourceLabel,
    source_url: item.link,
    author: null,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    has_video: false,
    video_url: null,
    image_url: item.imageUrl ?? null,
    tags: [category],
  };
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

  const reqUrl = new URL(req.url);
  const skipRss = reqUrl.searchParams.get("skipRss") === "true";
  const skipNewsData = reqUrl.searchParams.get("skipNewsData") === "true";

  const results: { url: string; fetched: number; classified: number; error?: string }[] = [];
  // deno-lint-ignore no-explicit-any
  const rows: Record<string, any>[] = [];

  if (!skipRss) {
    for (const source of FEED_SOURCES) {
      try {
        const items = await fetchRssItems(source.url);
        let classified = 0;
        for (const item of items.slice(0, MAX_ITEMS_PER_SOURCE)) {
          const category = source.classify(item.categories);
          if (!category || !item.title || !item.link) continue;
          classified += 1;
          rows.push(await buildRow(item, category, source.contentType, source.sourceLabel));
        }
        results.push({ url: source.url, fetched: items.length, classified });
      } catch (err) {
        results.push({ url: source.url, fetched: 0, classified: 0, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  const newsDataKey = Deno.env.get("NEWSDATA_API_KEY");
  if (newsDataKey && !skipNewsData) {
    for (const config of NEWSDATA_CATEGORIES) {
      const label = `newsdata:${config.category}`;
      try {
        const items = await fetchNewsDataItems(newsDataKey, config);
        let classified = 0;
        for (const item of items.slice(0, MAX_ITEMS_PER_SOURCE)) {
          if (!item.title || !item.link) continue;
          classified += 1;
          rows.push(await buildRow(item, config.targetCategory, config.contentType, item.sourceName));
        }
        results.push({ url: label, fetched: items.length, classified });
      } catch (err) {
        results.push({ url: label, fetched: 0, classified: 0, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  // A single batch can contain the same (category_key, slug) twice (e.g.
  // NewsData.io sometimes returns the same story more than once), which
  // Postgres's ON CONFLICT rejects outright. Keep the first occurrence.
  const seen = new Set<string>();
  const dedupedRows = rows.filter((row) => {
    const key = `${row.category_key}::${row.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (dedupedRows.length > 0) {
    const { error } = await supabase.from("articles").upsert(dedupedRows, { onConflict: "category_key,slug" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: dedupedRows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

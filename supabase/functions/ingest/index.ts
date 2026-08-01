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
// NEWSDATA_API_KEY (optional — NewsData source is skipped if unset),
// GEMINI_API_KEY (optional — ai_summary generation is skipped if unset).
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

const OG_IMAGE_CONCURRENCY = 8;
const IMAGE_GEN_CONCURRENCY = 3;
const AI_SUMMARY_CONCURRENCY = 5;
const TEXT_MODEL = "gemini-3.1-flash-lite";
// Kill switch — flip to false to re-enable. Must match
// src/lib/ingest/aiSummary.ts's flag of the same name.
const AI_SUMMARY_DISABLED = true;

// Some sources (Dinamalar via NewsData.io especially) don't include an image
// in their feed item at all — but their own article page usually still has
// an og:image meta tag. Read just enough of the page to find it rather than
// downloading the whole thing.
async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let received = 0;
    const MAX_BYTES = 150_000;
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});

    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function backfillMissingImages(rows: Record<string, any>[]): Promise<void> {
  const candidates = rows.filter((row) => !row.image_url && row.source_url);
  let next = 0;
  async function worker() {
    while (next < candidates.length) {
      const row = candidates[next++];
      row.image_url = await fetchOgImage(row.source_url);
    }
  }
  await Promise.all(Array.from({ length: Math.min(OG_IMAGE_CONCURRENCY, candidates.length) }, worker));
}

const CATEGORY_LABELS: Record<string, string> = {
  tamilnadu: "தமிழகம்",
  india: "இந்தியா",
  world: "உலகம்",
  business: "வணிகம்",
  technology: "தொழில்நுட்பம்",
  sports: "விளையாட்டு",
  cinema: "சினிமா",
  lifestyle: "லைஃப் ஸ்டைல்",
};

const IMAGE_MODEL = "gemini-3.1-flash-lite-image";
const STORAGE_BUCKET = "article-images";

// Kill switch — flip to false to re-enable. Turned off after repeated
// Gemini image-generation rate-limit hits during the backfill runs. Must
// match src/lib/ingest/images.ts's flag of the same name.
const IMAGE_GENERATION_DISABLED = true;

// Must match src/lib/ingest/images.ts's buildImagePrompt/generateFallbackImage
// exactly (same fetch-based Gemini call, works identically in Deno and
// Node) — kept in sync by hand, same reasoning as slugFor/buildRow above.
// Last resort after the RSS/NewsData image and the og:image scrape above
// both came up empty — generate a stand-in illustration instead of leaving
// the article to fall through to the site's generic placeholder graphic.
function buildImagePrompt(headline: string, category: string): string {
  return (
    `Editorial news illustration for a Tamil news article. Headline (for context only — never render this or any other text in the image): "${headline}". ` +
    `Category: ${CATEGORY_LABELS[category] ?? category}. ` +
    "Style: abstract, symbolic, flat color-block graphic design with simple icons or silhouettes representing the topic. " +
    "Absolutely no text, letters, or words anywhere in the image. " +
    "Never depict a real named person's face or likeness — use generic symbolic figures only. No logos or brand marks."
  );
}

async function generateFallbackImage(
  headline: string,
  category: string,
): Promise<{ data: Uint8Array; mimeType: string } | null> {
  if (IMAGE_GENERATION_DISABLED) return null;
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildImagePrompt(headline, category) }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok) return null;

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    // deno-lint-ignore no-explicit-any
    const imagePart = parts.find((p: any) => p?.inlineData?.data);
    if (!imagePart) return null;

    const binary = atob(imagePart.inlineData.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { data: bytes, mimeType: imagePart.inlineData.mimeType ?? "image/png" };
  } catch {
    return null;
  }
}

let bucketEnsured = false;

async function ensureArticleImageBucket(supabase: ReturnType<typeof createClient>): Promise<void> {
  if (bucketEnsured) return;
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw error;
  bucketEnsured = true;
}

async function uploadArticleImage(
  supabase: ReturnType<typeof createClient>,
  slug: string,
  image: { data: Uint8Array; mimeType: string },
): Promise<string | null> {
  const ext = image.mimeType.split("/")[1] ?? "png";
  const objectPath = `generated/${slug}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, image.data, { contentType: image.mimeType, upsert: true });
  if (error) return null;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

// deno-lint-ignore no-explicit-any
async function generateMissingImages(rows: Record<string, any>[], supabase: ReturnType<typeof createClient>): Promise<void> {
  if (!Deno.env.get("GEMINI_API_KEY")) return;

  const candidates = rows.filter((row) => !row.image_url);
  if (candidates.length === 0) return;

  await ensureArticleImageBucket(supabase);

  let next = 0;
  async function worker() {
    while (next < candidates.length) {
      const row = candidates[next++];
      const image = await generateFallbackImage(row.headline, row.category_key);
      if (!image) continue;
      row.image_url = await uploadArticleImage(supabase, `${row.category_key}-${row.slug}`, image);
    }
  }
  await Promise.all(Array.from({ length: Math.min(IMAGE_GEN_CONCURRENCY, candidates.length) }, worker));
}

// Must match src/lib/ingest/aiSummary.ts's rewriteDescription exactly (same
// fetch-based Gemini call, works identically in Deno and Node) — kept in
// sync by hand, same reasoning as slugFor/buildRow above.
function buildRewritePrompt(headline: string, dek: string): string {
  return (
    "Rewrite the following news summary, in your own words, as a Tamil summary for a news aggregator site. " +
    "If the original summary below is in English or mixed English/Tamil, translate it to Tamil as part of the rewrite. " +
    "Paraphrase — do not copy sentences verbatim — but preserve every fact exactly. " +
    "Keep it to 1-2 sentences, roughly the same length as the original. " +
    "Reply with the rewritten Tamil summary only — no preamble, no quotes, no language other than Tamil.\n\n" +
    `Headline: ${headline}\nOriginal summary: ${dek}`
  );
}

async function rewriteDescription(headline: string, dek: string): Promise<string | null> {
  if (AI_SUMMARY_DISABLED) return null;
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !dek) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${TEXT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: buildRewritePrompt(headline, dek) }] }] }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

// Skips rows that already have an ai_summary in the DB rather than
// re-generating on every ingest cycle — this function re-fetches and
// re-upserts the same articles from RSS every 15 minutes for as long as
// they stay within the feed's latest-N window, and Gemini calls aren't free.
// deno-lint-ignore no-explicit-any
async function generateAiSummaries(rows: Record<string, any>[], supabase: ReturnType<typeof createClient>): Promise<void> {
  if (!Deno.env.get("GEMINI_API_KEY")) return;

  const candidates = rows.filter((row) => row.source_url && row.dek);
  if (candidates.length === 0) return;

  const slugs = [...new Set(candidates.map((row) => row.slug))];
  const { data: existing } = await supabase.from("articles").select("slug,ai_summary").in("slug", slugs);
  const alreadySummarized = new Set(
    (existing ?? []).filter((row: { ai_summary: string | null }) => row.ai_summary).map(
      (row: { slug: string }) => row.slug,
    ),
  );
  const needed = candidates.filter((row) => !alreadySummarized.has(row.slug));
  if (needed.length === 0) return;

  let next = 0;
  async function worker() {
    while (next < needed.length) {
      const row = needed[next++];
      const summary = await rewriteDescription(row.headline, row.dek);
      if (summary) row.ai_summary = summary;
    }
  }
  await Promise.all(Array.from({ length: Math.min(AI_SUMMARY_CONCURRENCY, needed.length) }, worker));
}

// Must match src/lib/ingest/run.ts's slugFor exactly (same Web Crypto API,
// available natively in both Deno and Node) — both paths upsert against the
// same slug unique constraint.
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

  await backfillMissingImages(rows);

  // A single batch can contain the same slug twice (e.g. NewsData.io's
  // "top" query, mapped to tamilnadu, overlapping with its own business/
  // technology/sports/cinema queries returning the same underlying story).
  // slug (a hash of the source URL) is the article's real identity —
  // dedupe and upsert on that alone, not category_key, or the same article
  // ends up duplicated across category URLs (see
  // supabase/migrations/0014_dedupe_articles_by_slug.sql, which cleaned up
  // 786 rows this had already caused in production before this fix).
  const seen = new Set<string>();
  const dedupedRows = rows.filter((row) => {
    if (seen.has(row.slug)) return false;
    seen.add(row.slug);
    return true;
  });

  await generateMissingImages(dedupedRows, supabase);
  await generateAiSummaries(dedupedRows, supabase);

  if (dedupedRows.length > 0) {
    const { error } = await supabase.from("articles").upsert(dedupedRows, { onConflict: "slug" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: dedupedRows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

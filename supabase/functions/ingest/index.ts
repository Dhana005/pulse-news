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
// GEMINI_API_KEY (optional — fallback image generation is skipped if unset;
// currently disabled anyway, see IMAGE_GENERATION_DISABLED below).
// ai_summary generation moved to the ai-summary-batch function.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

type ContentType = "news" | "cinema";

interface FeedSource {
  url: string;
  sourceLabel: string;
  contentType: ContentType;
  classify: (categories: string[]) => string | null;
  // Overrides MAX_ITEMS_PER_SOURCE below for this source. Must match
  // src/lib/ingest/sources.ts's FeedSource.maxItems.
  maxItems?: number;
}

const TN_CITY_TAGS = new Set([
  "chennai", "tamilnadu", "madurai", "tirupati", "coimbatore", "salem",
  "trichy", "tiruchirappalli", "tirunelveli", "vellore", "erode", "thanjavur", "madras",
]);
const NON_INDIA_CITY_TAGS = new Set(["singapore", "dubai", "london", "newyork", "colombo"]);

function classifyOneindia(categories: string[]): string | null {
  for (const raw of categories) {
    const cat = raw.toLowerCase();
    // Oneindia tags its daily rate-update stories "gold-rate" directly (not
    // under the "news/" prefix like everything else here) — verified against
    // its raw RSS. Checked first since it's unambiguous. Must match
    // src/lib/ingest/sources.ts's classifyOneindia exactly.
    if (cat.startsWith("gold-rate")) return "gold";
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
  // Unlike the Vikatan feeds above (each pre-filtered to one vertical),
  // this is Oneindia's general feed mixing many topics — astrology,
  // weather, sports, regional news, gold-rate updates, all interleaved.
  // Must match src/lib/ingest/sources.ts's maxItems for this source.
  { url: "https://tamil.oneindia.com/rss/feeds/oneindia-tamil-fb.xml", sourceLabel: "Oneindia Tamil", contentType: "news", classify: classifyOneindia, maxItems: 40 },
];

// NewsData.io's Tamil corpus skews heavily to Tamil Nadu regional sources
// even under category=top — no clean "India national" split, so "india" is
// left to the Vikatan RSS feed above. "politics" below is now used as its
// own category (checked before "top" so it wins the dedup).
interface NewsDataCategoryConfig {
  category: string;
  targetCategory: string;
  contentType: ContentType;
  country?: string;
}
const NEWSDATA_CATEGORIES: NewsDataCategoryConfig[] = [
  // Checked before "top" below — must match src/lib/ingest/newsdata.ts's
  // ordering exactly (dedup keeps the first occurrence per slug, so
  // politics has to win over the same story appearing under "top").
  { category: "politics", targetCategory: "politics", contentType: "news", country: "in" },
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
  politics: "அரசியல்",
  world: "உலகம்",
  business: "வணிகம்",
  gold: "தங்கம் விலை",
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

// ai_summary generation moved to the ai-summary-batch function (Gemini
// Batch API, 50% cheaper) — see supabase/functions/ai-summary-batch. New
// articles just stay on the dek fallback (see the article page's
// aiSummary || dek logic) until that function's next cycle picks them up.

// Must match src/lib/ingest/run.ts's recordCategoryMoves exactly — a slug's
// category_key can shift between ingest runs (e.g. a story drops out of
// NewsData's "top" query by the next run but is still returned by its
// "business" query), and upsert (onConflict: "slug") silently moves the row
// to a new URL when that happens, orphaning the old one. Same mechanism as
// the one-time cleanup in supabase/migrations/0014_dedupe_articles_by_slug.sql,
// except ongoing. Records a redirect before the upsert overwrites
// category_key, and flattens existing redirects that pointed at the old
// category — see getArticleRedirect in src/lib/data.ts.
// deno-lint-ignore no-explicit-any
async function recordCategoryMoves(rows: Record<string, any>[], supabase: ReturnType<typeof createClient>): Promise<void> {
  const slugs = rows.map((r) => r.slug);
  if (slugs.length === 0) return;

  const { data: existing, error: fetchError } = await supabase
    .from("articles")
    .select("slug,category_key")
    .in("slug", slugs);
  if (fetchError) throw fetchError;

  // deno-lint-ignore no-explicit-any
  const oldCategoryBySlug = new Map((existing ?? []).map((r: any) => [r.slug, r.category_key]));
  const moved = rows.filter((row) => {
    const oldCategory = oldCategoryBySlug.get(row.slug);
    return oldCategory && oldCategory !== row.category_key;
  });
  if (moved.length === 0) return;

  const redirects = moved.map((row) => ({
    category_key: oldCategoryBySlug.get(row.slug),
    slug: row.slug,
    canonical_category_key: row.category_key,
    canonical_slug: row.slug,
  }));
  const { error: upsertError } = await supabase
    .from("article_redirects")
    .upsert(redirects, { onConflict: "category_key,slug" });
  if (upsertError) throw upsertError;

  for (const row of moved) {
    const oldCategory = oldCategoryBySlug.get(row.slug);
    const { error: chainError } = await supabase
      .from("article_redirects")
      .update({ canonical_category_key: row.category_key, canonical_slug: row.slug })
      .eq("canonical_category_key", oldCategory)
      .eq("canonical_slug", row.slug);
    if (chainError) throw chainError;
  }
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
        for (const item of items.slice(0, source.maxItems ?? MAX_ITEMS_PER_SOURCE)) {
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

  if (dedupedRows.length > 0) {
    await recordCategoryMoves(dedupedRows, supabase);
    const { error } = await supabase.from("articles").upsert(dedupedRows, { onConflict: "slug" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: dedupedRows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

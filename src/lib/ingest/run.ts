import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchRssItems } from "./parse";
import { FEED_SOURCES } from "./sources";
import { fetchNewsDataItems, NEWSDATA_CATEGORIES } from "./newsdata";
import { ensureArticleImageBucket, generateFallbackImage, uploadArticleImage } from "./images";

const MAX_ITEMS_PER_SOURCE = 15;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Last resort after the RSS/NewsData image and the og:image scrape above
// both came up empty — generate a stand-in illustration instead of leaving
// the article to fall through to the site's generic placeholder graphic.
// No-op without GEMINI_API_KEY (generateFallbackImage returns null).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateMissingImages(rows: Record<string, any>[], supabase: SupabaseClient): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return;

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

// Web Crypto SHA-1, not Node's `crypto` module — must match the Supabase
// Edge Function's slugFor exactly (same runtime API, Deno), since both
// paths upsert against the same (category_key, slug) unique constraint.
async function slugFor(link: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(link));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

interface SourceResult {
  url: string;
  fetched: number;
  classified: number;
  error?: string;
}

interface NormalizedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  imageUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildRow(
  item: NormalizedItem,
  category: string,
  contentType: "news" | "cinema",
  sourceLabel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  return {
    slug: await slugFor(item.link),
    category_key: category,
    content_type: contentType,
    language: "ta",
    headline: item.title,
    dek: item.description || item.title,
    body: [], // aggregator model: snippet + link-out, never full republish
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

export interface RunIngestionOptions {
  // RSS has no rate limit, so it can run frequently. NewsData.io's free
  // tier is ~200 requests/day (4 per run here) — skip it on the frequent
  // schedule and only run it on a slower, separate one.
  skipRss?: boolean;
  skipNewsData?: boolean;
}

export async function runIngestion(
  options: RunIngestionOptions = {},
): Promise<{ upserted: number; results: SourceResult[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(url, serviceKey);

  const results: SourceResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Record<string, any>[] = [];

  if (!options.skipRss) {
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
        results.push({
          url: source.url,
          fetched: 0,
          classified: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const newsDataKey = process.env.NEWSDATA_API_KEY;
  if (newsDataKey && !options.skipNewsData) {
    for (const config of NEWSDATA_CATEGORIES) {
      const label = `newsdata:${config.category}`;
      try {
        const items = await fetchNewsDataItems(newsDataKey, config);
        let classified = 0;
        for (const item of items.slice(0, MAX_ITEMS_PER_SOURCE)) {
          if (!item.title || !item.link) continue;
          classified += 1;
          rows.push(
            await buildRow(
              { ...item, imageUrl: item.imageUrl ?? undefined },
              config.targetCategory,
              config.contentType,
              item.sourceName,
            ),
          );
        }
        results.push({ url: label, fetched: items.length, classified });
      } catch (err) {
        results.push({ url: label, fetched: 0, classified: 0, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  await backfillMissingImages(rows);

  // A single batch can contain the same (category_key, slug) twice — e.g.
  // NewsData.io sometimes returns the same story more than once in one
  // response — which Postgres's ON CONFLICT rejects outright. Keep the
  // first occurrence.
  const seen = new Set<string>();
  const dedupedRows = rows.filter((row) => {
    const key = `${row.category_key}::${row.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await generateMissingImages(dedupedRows, supabase);

  if (dedupedRows.length > 0) {
    const { error } = await supabase.from("articles").upsert(dedupedRows, { onConflict: "category_key,slug" });
    if (error) throw error;
  }

  return { upserted: dedupedRows.length, results };
}

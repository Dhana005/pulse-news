import { createClient } from "@supabase/supabase-js";
import { fetchRssItems } from "./parse";
import { FEED_SOURCES } from "./sources";
import { fetchNewsDataItems, NEWSDATA_CATEGORIES } from "./newsdata";

const MAX_ITEMS_PER_SOURCE = 15;
const DEK_MAX_LEN = 220;

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

function truncateDek(text: string): string {
  if (text.length <= DEK_MAX_LEN) return text;
  return text.slice(0, DEK_MAX_LEN).trimEnd() + "…";
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
    dek: truncateDek(item.description || item.title),
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

  if (dedupedRows.length > 0) {
    const { error } = await supabase.from("articles").upsert(dedupedRows, { onConflict: "category_key,slug" });
    if (error) throw error;
  }

  return { upserted: dedupedRows.length, results };
}

// Supabase Edge Function: assembles "எடிட்டரின் தேர்வு" (Editor's Picks) from
// two real sources — Vikatan's editorial.rss (filtered to its "Editorial"
// category) for opinion columns, and Oneindia Tamil's /fact-check/ listing
// page (scraped, no RSS exists for it) for fact-checks. Kept in sync by
// hand with src/lib/ingest/opinion.ts (Deno can't import the Next.js app's
// TS directly), same as the `ingest` function.
//
// Scheduled every 2 hours via pg_cron (see
// supabase/migrations/0011_opinion_ingest.sql) — both sources publish at
// most a few times a week, not continuously like news.
//
// Deploy: paste this file's contents into the Supabase Dashboard's
// Edge Functions editor, or `supabase functions deploy ingest-opinion`.
// Secrets needed (Functions -> ingest-opinion -> Secrets): INGEST_SECRET,
// GEMINI_API_KEY (optional — fallback image generation is skipped if unset;
// neither source provides a usable image, so without this every article
// here shows the site's generic placeholder graphic instead).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

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

// Must match src/lib/ingest/images.ts's buildImagePrompt/generateFallbackImage
// exactly (same fetch-based Gemini call, works identically in Deno and
// Node) — kept in sync by hand, same as the `ingest` function. Vikatan's
// editorial.rss never includes an image, and there's no per-article page to
// scrape an og:image from without a lot more work, so this is the only way
// these get anything other than the site's generic placeholder graphic.
const CATEGORY_LABELS: Record<string, string> = { tamilnadu: "தமிழகம்", india: "இந்தியா" };
const IMAGE_MODEL = "gemini-3.1-flash-lite-image";
const STORAGE_BUCKET = "article-images";
const IMAGE_GEN_CONCURRENCY = 3;

// Kill switch — flip to false to re-enable. Turned off after repeated
// Gemini image-generation rate-limit hits during the backfill runs. Must
// match src/lib/ingest/images.ts's flag of the same name.
const IMAGE_GENERATION_DISABLED = true;

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
  // deno-lint-ignore no-explicit-any
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
      published: new Date().toISOString(),
      imageUrl: imgMatch?.[1],
    });
  }
  return items;
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

  const results: { source: string; fetched: number; error?: string }[] = [];
  // deno-lint-ignore no-explicit-any
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

  await generateMissingImages(rows, supabase);

  if (rows.length > 0) {
    // slug (a hash of the source URL) is the article's real identity, not
    // (category_key, slug) — see supabase/migrations/0014_dedupe_articles_by_slug.sql.
    const { error } = await supabase.from("articles").upsert(rows, { onConflict: "slug" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: rows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

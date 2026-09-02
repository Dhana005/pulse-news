import { supabase } from "./supabase";

// Content_type-aware data layer backed by Supabase. `articles` covers both
// `news` and `cinema`; `horoscopes` is evergreen content keyed by date, not
// pulled from the news pipeline. See supabase/migrations/0001_init.sql.

export type ContentType = "news" | "cinema";

export interface Article {
  id: string;
  slug: string;
  category: string;
  contentType: ContentType;
  headline: string;
  dek: string;
  // Gemini-rewritten (and translated, if needed) version of dek, generated
  // once at ingest time — see src/lib/ingest/aiSummary.ts. Preferred over
  // dek for display on the article page when present; null if generation
  // hasn't run yet or GEMINI_API_KEY isn't configured.
  aiSummary?: string;
  source: string;
  publishedAgo: string;
  // Raw ISO timestamp — for structured data (NewsArticle datePublished,
  // OpenGraph article:published_time). publishedAgo above is the relative
  // Tamil string used for display, not suitable for those.
  publishedAt: string;
  author: string;
  hasVideo: boolean;
  videoUrl?: string;
  tags: string[];
  bodyParas: string[];
  imageUrl?: string;
  // Set for aggregated/ingested articles (RSS). The article page links out
  // to this instead of rendering a full body — aggregator model, not a
  // republishing one (copyright + Google News compliance).
  sourceUrl?: string;
}

interface ArticleRow {
  id: string;
  slug: string;
  category_key: string;
  content_type: ContentType;
  headline: string;
  dek: string | null;
  ai_summary: string | null;
  body: string[] | null;
  source: string | null;
  source_url: string | null;
  author: string | null;
  published_at: string;
  has_video: boolean;
  video_url: string | null;
  image_url: string | null;
  tags: string[] | null;
}

// Some feeds (Oneindia Tamil's especially — verified against its raw RSS)
// write a Tamil <title> but an English <description>, since that field is
// meant for Facebook link-preview cards, not for display here. Rather than
// show English text on a Tamil site, treat a dek as unusable unless Tamil
// script makes up a real share of its letters — a stray transliterated word
// or two shouldn't disqualify an otherwise-Tamil sentence.
function isMostlyTamil(text: string): boolean {
  const tamilLetters = (text.match(/[஀-௿]/g) ?? []).length;
  const latinLetters = (text.match(/[A-Za-z]/g) ?? []).length;
  const totalLetters = tamilLetters + latinLetters;
  if (totalLetters === 0) return true; // numbers/punctuation only — nothing to object to
  return tamilLetters / totalLetters >= 0.3;
}

// A page whose only real text is a one-line teaser (or nothing at all)
// beyond the headline has no "reason to visit" independent of the outbound
// source link — exactly what AdSense/Google flag as thin/low-value content.
// Raised from 200 to 400 after an audit (2026-09-02) found 200 let ~41% of
// the whole catalogue through on nothing but a short AI paraphrase of a
// thin source snippet — technically "not thin" but not substantive either.
// 400 chars ~= a real short paragraph, not just a sentence.
const SUBSTANTIVE_TEXT_MIN_CHARS = 400;

// Some outlets publish rolling multi-topic "headline roundup" bulletins
// (News18's "Today Headlines" franchise, seen both via its YouTube channel
// and its own site's RSS feed) rather than single-story articles. Their
// descriptions concatenate many unrelated topics and can run thousands of
// characters — clearing any length threshold without ever being about one
// specific story — so length alone can't catch them; the title convention
// this franchise uses consistently can. Found via the same 2026-09-02 audit:
// two of these had byte-identical AI summaries across separate URLs.
const BULLETIN_ROUNDUP_TITLE = /^today(\s+\d{1,2}\s*(am|pm))?\s+headlines\b/i;

export function isThinArticle(
  article: Pick<Article, "headline" | "dek" | "aiSummary" | "sourceUrl" | "bodyParas">,
): boolean {
  if (BULLETIN_ROUNDUP_TITLE.test(article.headline)) return true;
  if (!article.sourceUrl) {
    return article.bodyParas.join("").length < SUBSTANTIVE_TEXT_MIN_CHARS;
  }
  const hasSubstantiveSummary = (article.aiSummary?.length ?? 0) >= SUBSTANTIVE_TEXT_MIN_CHARS;
  const hasSubstantiveDek = article.dek.length >= SUBSTANTIVE_TEXT_MIN_CHARS;
  return !hasSubstantiveSummary && !hasSubstantiveDek;
}

// Same check as isThinArticle, but taking a raw Supabase row shape (a subset
// of ArticleRow) so callers that only need a thin/not-thin verdict — sitemap
// routes, mainly — can select just these columns instead of the full row
// toArticle needs. Applies the same isMostlyTamil filter to dek that
// toArticle does, so a long non-Tamil dek can't count as substantive here
// when it would actually render as "" (and thus noindex) on the article
// page itself — the two must agree, or a sitemap could list a URL the page
// itself excludes from indexing.
export function isThinRow(row: {
  headline: string;
  dek: string | null;
  ai_summary: string | null;
  source_url: string | null;
  body: string[] | null;
}): boolean {
  const dek = row.dek ?? "";
  return isThinArticle({
    headline: row.headline,
    dek: isMostlyTamil(dek) ? dek : "",
    aiSummary: row.ai_summary ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    bodyParas: row.body ?? [],
  });
}

function relativeTa(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} நிமிடம் முன்`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} மணி நேரம் முன்`;
  return `${Math.round(hours / 24)} நாள் முன்`;
}

function toArticle(row: ArticleRow): Article {
  const dek = row.dek ?? "";
  return {
    id: row.id,
    slug: row.slug,
    category: row.category_key,
    contentType: row.content_type,
    headline: row.headline,
    dek: isMostlyTamil(dek) ? dek : "",
    aiSummary: row.ai_summary ?? undefined,
    source: row.source ?? "",
    publishedAgo: relativeTa(row.published_at),
    publishedAt: row.published_at,
    author: row.author ?? row.source ?? "",
    hasVideo: row.has_video,
    videoUrl: row.video_url ?? undefined,
    tags: row.tags ?? [],
    bodyParas: row.body ?? [],
    imageUrl: row.image_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
  };
}

export async function getCategoryArticles(category: string, limit = 24, offset = 0): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("category_key", category)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map(toArticle);
}

export async function getArticle(category: string, slug: string): Promise<Article | undefined> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("category_key", category)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toArticle(data) : undefined;
}

// Consulted when getArticle finds nothing — the (category, slug) may be a
// pre-migration duplicate URL that got consolidated (see
// supabase/migrations/0014_dedupe_articles_by_slug.sql). Returns the
// canonical path to permanently redirect to, or null for a genuine 404.
export async function getArticleRedirect(category: string, slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("article_redirects")
    .select("canonical_category_key,canonical_slug")
    .eq("category_key", category)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? `/ta/${data.canonical_category_key}/${data.canonical_slug}` : null;
}

export async function getRelated(category: string, excludeSlug: string, count = 4): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("category_key", category)
    .neq("slug", excludeSlug)
    .order("published_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []).map(toArticle);
}

// Picks the most recent `limit` rows while capping how many can come from
// any single source. Without this, one prolific/frequently-publishing
// source (e.g. overnight, when most Tamil dailies go quiet) can crowd out
// every other source in "latest across all categories" spots like the
// homepage hero, trending widget, and ticker.
function diversifyBySource<T>(rows: T[], limit: number, sourceOf: (row: T) => string, maxPerSource = 1): T[] {
  const perSourceCount = new Map<string, number>();
  const selected: T[] = [];
  const leftover: T[] = [];
  for (const row of rows) {
    const src = sourceOf(row);
    const used = perSourceCount.get(src) ?? 0;
    if (used < maxPerSource && selected.length < limit) {
      selected.push(row);
      perSourceCount.set(src, used + 1);
    } else {
      leftover.push(row);
    }
  }
  for (const row of leftover) {
    if (selected.length >= limit) break;
    selected.push(row);
  }
  return selected;
}

export async function getTrending(count = 5): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(Math.max(count * 8, 30));
  if (error) throw error;
  const rows = diversifyBySource(data ?? [], count, (r) => r.source ?? "");
  return rows.map(toArticle);
}

export async function getHeroFeed(): Promise<{ lead: Article; side: Article[] }> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = diversifyBySource(data ?? [], 4, (r) => r.source ?? "");
  const articles = rows.map(toArticle);
  const [lead, ...side] = articles;
  return { lead, side };
}

export async function getVideoArticles(count = 4): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("has_video", true)
    .order("published_at", { ascending: false })
    .limit(Math.max(count * 8, 30));
  if (error) throw error;
  const rows = diversifyBySource(data ?? [], count, (r) => r.source ?? "");
  return rows.map(toArticle);
}

export async function getEditorsPicks(): Promise<{ opinions: Article[]; factCheck: Article | null }> {
  const [{ data: opinionRows, error: opinionError }, { data: factRows, error: factError }] = await Promise.all([
    supabase.from("articles").select("*").contains("tags", ["opinion"]).order("published_at", { ascending: false }).limit(3),
    supabase.from("articles").select("*").contains("tags", ["factcheck"]).order("published_at", { ascending: false }).limit(1),
  ]);
  if (opinionError) throw opinionError;
  if (factError) throw factError;

  return {
    opinions: (opinionRows ?? []).map(toArticle),
    factCheck: factRows?.[0] ? toArticle(factRows[0]) : null,
  };
}

export interface PhotoGallery {
  category: string;
  coverImageUrl: string;
  count: number;
}

// No dedicated photo-gallery source exists (unlike video/horoscope, there's
// no clean site to scrape themed galleries from) — instead this builds real
// galleries from images already sitting in our own ingested articles,
// grouped by category. Counts and thumbnails are genuine, not fabricated;
// clicking through goes to that category's listing since there's no
// standalone multi-image lightbox route.
const GALLERY_CATEGORIES = ["cinema", "sports", "tamilnadu", "world"];

export async function getPhotoGalleries(): Promise<PhotoGallery[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const galleries = await Promise.all(
    GALLERY_CATEGORIES.map(async (category) => {
      // Two queries per category rather than one shared limit across all of
      // them — a single combined limit gets dominated by whichever category
      // publishes the most, silently undercounting the rest.
      const [{ count }, { data: coverRows }] = await Promise.all([
        supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("category_key", category)
          .not("image_url", "is", null)
          .gt("published_at", since),
        supabase
          .from("articles")
          .select("image_url")
          .eq("category_key", category)
          .not("image_url", "is", null)
          .gt("published_at", since)
          .order("published_at", { ascending: false })
          .limit(1),
      ]);
      const coverImageUrl = coverRows?.[0]?.image_url as string | undefined;
      return coverImageUrl && count ? { category, coverImageUrl, count } : null;
    }),
  );

  return galleries.filter((g): g is PhotoGallery => g !== null);
}

export async function getFeaturedArticles(count = 6): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(Math.max(count * 8, 40));
  if (error) throw error;
  const rows = diversifyBySource(data ?? [], count, (r) => r.source ?? "");
  return rows.map(toArticle);
}

export async function getMostRead(count = 5): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .gt("published_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order("view_count", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []).map(toArticle);
}

export async function searchArticles(query: string, limit = 24): Promise<Article[]> {
  const term = query.trim();
  if (!term) return [];
  const pattern = `%${term}%`;
  // Two parameterized ilike queries instead of a single .or(...) — .or()
  // takes a raw comma-separated filter string, so interpolating user input
  // into it would let a query containing "," or "(" alter the filter logic.
  const [byHeadline, byDek] = await Promise.all([
    supabase.from("articles").select("*").ilike("headline", pattern).order("published_at", { ascending: false }).limit(limit),
    supabase.from("articles").select("*").ilike("dek", pattern).order("published_at", { ascending: false }).limit(limit),
  ]);
  if (byHeadline.error) throw byHeadline.error;
  if (byDek.error) throw byDek.error;

  const seen = new Set<string>();
  const merged: ArticleRow[] = [];
  for (const row of [...(byHeadline.data ?? []), ...(byDek.data ?? [])]) {
    const key = `${row.category_key}::${row.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  merged.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return merged.slice(0, limit).map(toArticle);
}

export async function getTickerItems(): Promise<string[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("headline, source")
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = diversifyBySource(data ?? [], 4, (r) => r.source ?? "");
  return rows.map((r) => r.headline);
}

// Horoscope — evergreen content_type, keyed by calendar date, not sourced
// from the news pipeline.
export interface HoroscopeReading {
  rashiKey: string;
  rashiName: string;
  text: string;
}

export async function getHoroscopeReadings(): Promise<HoroscopeReading[]> {
  const today = new Date().toISOString().slice(0, 10);
  let { data, error } = await supabase
    .from("horoscopes")
    .select("rashi_key, rashi_name, reading_text")
    .eq("reading_date", today)
    .order("sort_order");
  if (error) throw error;

  if (!data || data.length === 0) {
    // Not seeded for today yet (cron runs once daily) — fall back to the
    // most recent day's readings rather than showing an empty widget.
    const fallback = await supabase
      .from("horoscopes")
      .select("rashi_key, rashi_name, reading_text, reading_date")
      .order("reading_date", { ascending: false })
      .order("sort_order")
      .limit(12);
    if (fallback.error) throw fallback.error;
    data = fallback.data ?? [];
  }

  return data.map((r) => ({ rashiKey: r.rashi_key, rashiName: r.rashi_name, text: r.reading_text }));
}

export function todayLabel(): string {
  return "இன்று · " + new Date().toLocaleDateString("ta-IN", { day: "numeric", month: "long" });
}

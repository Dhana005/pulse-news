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
  source: string;
  publishedAgo: string;
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

function relativeTa(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} நிமிடம் முன்`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} மணி நேரம் முன்`;
  return `${Math.round(hours / 24)} நாள் முன்`;
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category_key,
    contentType: row.content_type,
    headline: row.headline,
    dek: row.dek ?? "",
    source: row.source ?? "",
    publishedAgo: relativeTa(row.published_at),
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

export async function getTrending(count = 5): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []).map(toArticle);
}

export async function getHeroFeed(): Promise<{ lead: Article; side: Article[] }> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(4);
  if (error) throw error;
  const articles = (data ?? []).map(toArticle);
  const [lead, ...side] = articles;
  return { lead, side };
}

export async function getTickerItems(): Promise<string[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("headline")
    .order("published_at", { ascending: false })
    .limit(4);
  if (error) throw error;
  return (data ?? []).map((r) => r.headline);
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

// NewsData.io source. Verified live against the real API before wiring up:
// its Tamil-language corpus skews heavily to Tamil Nadu regional sources
// (Dinamalar etc.) even under category=politics/top, so there's no clean
// "India national" split — we lean on it for tamilnadu/world/sports/cinema
// and leave "india" to the Vikatan RSS feed, which already covers it well.
//
// Free tier is ~200 credits/day, 1 credit per request — this module makes
// 4 requests per ingestion run, so the cron interval (see
// supabase/migrations/0004_hourly_cron.sql) is hourly, not every 30 min.

import { stripHtml } from "./parse";

export interface NewsDataItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string; // "YYYY-MM-DD HH:MM:SS", UTC
  imageUrl?: string;
  sourceName: string;
}

interface NewsDataCategoryConfig {
  category: string;
  targetCategory: string;
  contentType: "news" | "cinema";
  country?: string;
}

export const NEWSDATA_CATEGORIES: NewsDataCategoryConfig[] = [
  { category: "top", targetCategory: "tamilnadu", contentType: "news", country: "in" },
  { category: "sports", targetCategory: "sports", contentType: "news", country: "in" },
  { category: "entertainment", targetCategory: "cinema", contentType: "cinema", country: "in" },
  { category: "world", targetCategory: "world", contentType: "news" }, // no country filter — global
  { category: "business", targetCategory: "business", contentType: "news", country: "in" },
  { category: "technology", targetCategory: "technology", contentType: "news", country: "in" },
  { category: "lifestyle", targetCategory: "lifestyle", contentType: "news", country: "in" },
];

export async function fetchNewsDataItems(
  apiKey: string,
  config: NewsDataCategoryConfig,
): Promise<NewsDataItem[]> {
  const params = new URLSearchParams({
    apikey: apiKey,
    language: "ta",
    category: config.category,
  });
  if (config.country) params.set("country", config.country);

  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`newsdata ${config.category} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "success") throw new Error(`newsdata ${config.category} -> ${JSON.stringify(json)}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.results ?? []).map((r: any) => ({
    title: stripHtml(r.title ?? ""),
    link: r.link ?? "",
    description: stripHtml(r.description ?? ""),
    pubDate: r.pubDate ?? undefined,
    imageUrl: r.image_url ?? undefined,
    sourceName: r.source_name ?? "NewsData",
  }));
}

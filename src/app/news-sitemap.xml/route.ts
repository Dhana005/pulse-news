import { supabase } from "@/lib/supabase";
import { isThinRow } from "@/lib/data";

// Google News Sitemap (https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)
// — a separate feed from the general sitemap.ts (which only lists static +
// category pages, no articles at all). Google News only wants articles
// published in the last 2 days here, capped at 1000 URLs per the spec, so
// this can't reuse the generic MetadataRoute.Sitemap file convention (no
// <news:news> namespace support) — same reasoning as rss.xml/route.ts using
// a raw Response instead. Linked from public/robots.txt's Sitemap: line.
//
// Thin articles get `noindex` on their own page (see isThinArticle's doc
// comment in lib/data.ts) — submitting them here anyway would hand Google
// News a feed that contradicts that signal, so the same check gates entry
// into this sitemap too.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PUBLICATION_NAME = "PulseNews";
const MAX_URLS = 1000;
const WINDOW_HOURS = 48;

export const revalidate = 300;

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

export async function GET() {
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("slug, category_key, headline, published_at, dek, ai_summary, source_url, body")
    .gt("published_at", since)
    .order("published_at", { ascending: false })
    .limit(MAX_URLS);

  if (error) throw error;

  const urls = (data ?? [])
    .filter((row) => !isThinRow(row))
    .map((row) => {
      const loc = `${BASE_URL}/ta/${row.category_key}/${row.slug}`;
      const publishedIso = new Date(row.published_at).toISOString();
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>ta</news:language>
      </news:publication>
      <news:publication_date>${publishedIso}</news:publication_date>
      <news:title>${escapeXml(row.headline)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

import { SHARD_COUNT } from "@/lib/sitemapShards";

// Sitemap INDEX for the full article catalogue — distinct from sitemap.ts
// (16 static/category URLs only, no articles) and news-sitemap.xml (only
// the last 48h, capped at 1000, per the Google News spec — see that route's
// comment). Without this, an article stops being sitemap-discoverable the
// moment it ages out of news-sitemap.xml, leaving only internal links to
// carry it — which is the likely driver behind Search Console's rising
// "Discovered – currently not indexed" count on a catalogue this size.
//
// Points at a fixed SHARD_COUNT of /articles-sitemap/{shard} sub-sitemaps —
// see sitemapShards.ts for why shard count is a fixed constant rather than
// computed from a live row count.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export async function GET() {
  const now = new Date().toISOString();

  const sitemaps = Array.from(
    { length: SHARD_COUNT },
    (_, shard) => `  <sitemap>
    <loc>${BASE_URL}/articles-sitemap/${shard}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

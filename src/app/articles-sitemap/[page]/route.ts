import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isThinRow } from "@/lib/data";
import { SHARD_COUNT, shardBounds } from "@/lib/sitemapShards";

// One shard of the full-catalogue article sitemap — see articles-sitemap.xml/
// route.ts and sitemapShards.ts for why this is UUID-range sharded rather
// than offset-paginated (offset + ORDER BY published_at hit Postgres's
// statement timeout at this table's size — no index supports that global
// sort). Within a shard, still fetched in SUPABASE_CHUNK-row slices because
// Postgrest caps .range()/.limit() at 1000 rows per request regardless of
// what's asked for — verified directly against this project's database —
// but each slice is a `WHERE id >= gte AND id < lt AND id > cursor ORDER BY
// id LIMIT 1000` keyset scan on the primary-key index, not a table-wide
// sort+skip, so it stays fast independent of shard position or table size.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SUPABASE_CHUNK = 1000;

export const revalidate = 3600;

interface Row {
  id: string;
  slug: string;
  category_key: string;
  published_at: string;
  dek: string | null;
  ai_summary: string | null;
  source_url: string | null;
  body: string[] | null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page: pageParam } = await params;
  const shard = Number(pageParam);
  if (!Number.isInteger(shard) || shard < 0 || shard >= SHARD_COUNT) notFound();

  const { gte, lt } = shardBounds(shard);
  const rows: Row[] = [];
  let cursor: string | null = null;

  for (;;) {
    let query = supabase
      .from("articles")
      .select("id, slug, category_key, published_at, dek, ai_summary, source_url, body")
      .order("id", { ascending: true })
      .limit(SUPABASE_CHUNK);
    query = cursor ? query.gt("id", cursor) : query.gte("id", gte);
    if (lt) query = query.lt("id", lt);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    cursor = data[data.length - 1].id;
    if (data.length < SUPABASE_CHUNK) break;
  }

  const urls = rows
    .filter((row) => !isThinRow(row))
    .map((row) => {
      const loc = `${BASE_URL}/ta/${row.category_key}/${row.slug}`;
      const lastmod = new Date(row.published_at).toISOString();
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

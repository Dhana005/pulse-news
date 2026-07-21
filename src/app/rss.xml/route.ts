import { supabase } from "@/lib/supabase";
import { getCategoryLabel } from "@/lib/categories";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  const { data, error } = await supabase
    .from("articles")
    .select("slug, category_key, headline, dek, published_at")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const items = (data ?? [])
    .map((row) => {
      const url = `${BASE_URL}/ta/${row.category_key}/${row.slug}`;
      return `    <item>
      <title>${escapeXml(row.headline)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(row.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(getCategoryLabel(row.category_key))}</category>
      ${row.dek ? `<description>${escapeXml(row.dek)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PulseNews — தமிழ் செய்திகள்</title>
    <link>${BASE_URL}/ta</link>
    <description>PulseNews தளத்தின் சமீபத்திய தமிழ் செய்திகள்.</description>
    <language>ta</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

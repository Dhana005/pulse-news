import { XMLParser } from "fast-xml-parser";

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  imageUrl?: string;
  categories: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchRssItems(url: string): Promise<RawFeedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);

  const items = asArray(doc?.rss?.channel?.item);

  return items.map((item: Record<string, unknown>): RawFeedItem => {
    const mediaContent = item["media:content"] as { "@_url"?: string } | undefined;
    const mediaThumb = item["media:thumbnail"] as { "@_url"?: string } | undefined;
    const imageUrl = mediaContent?.["@_url"] ?? mediaThumb?.["@_url"] ?? undefined;

    const categories = asArray(item.category as string | string[] | undefined).map((c) =>
      textOf(c).trim(),
    );

    return {
      title: stripHtml(textOf(item.title)),
      link: stripHtml(textOf(item.link)),
      description: stripHtml(textOf(item.description)),
      pubDate: textOf(item.pubDate) || undefined,
      imageUrl,
      categories,
    };
  });
}

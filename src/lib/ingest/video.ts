import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

// YouTube's public per-channel video feed — no API key needed, same spirit
// as the RSS news sources. Verified by hand against each channel's real
// upload history before wiring up (see conversation history): all five post
// general Tamil news multiple times a day.
interface VideoSource {
  channelId: string;
  sourceLabel: string;
}

const VIDEO_SOURCES: VideoSource[] = [
  { channelId: "UCmyKnNRH0wH-r8I-ceP-dsg", sourceLabel: "Puthiyathalaimurai" },
  { channelId: "UC-JFyL0zDFOsPMpuWu39rPA", sourceLabel: "Thanthi TV" },
  { channelId: "UCYlh4lH762HvHt6mmiecyWQ", sourceLabel: "Sun News Tamil" },
  { channelId: "UC8Z-VjXBtDJTvq6aqkIskPg", sourceLabel: "Polimer News" },
  { channelId: "UCat88i6_rELqI_prwvjspRA", sourceLabel: "News18 Tamil Nadu" },
];

const MAX_VIDEOS_PER_CHANNEL = 5;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// These are general-news channels covering everything from politics to
// cricket, so a handful of keywords is enough to route the occasional
// sports/cinema upload to a better category than the "tamilnadu" default.
function classifyVideo(title: string): string {
  const t = title.toLowerCase();
  if (/ipl|cricket|கிரிக்கெட்|worldcup|t20|\bmatch\b/.test(t)) return "sports";
  if (/சினிமா|movie review|trailer|படம்|தியேட்டர்|actor|director|இயக்குனர்/.test(t)) return "cinema";
  return "tamilnadu";
}

interface VideoEntry {
  videoId: string;
  title: string;
  link: string;
  published: string;
  thumbnailUrl?: string;
}

async function fetchChannelVideos(channelId: string): Promise<VideoEntry[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`youtube feed ${channelId} -> HTTP ${res.status}`);
  const xml = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = parser.parse(xml);
  const entries = asArray(doc?.feed?.entry);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return entries.map((entry: Record<string, any>) => {
    const mediaGroup = entry["media:group"] ?? {};
    const thumbnail = mediaGroup["media:thumbnail"] as { "@_url"?: string } | undefined;
    const link = Array.isArray(entry.link) ? entry.link[0] : entry.link;
    return {
      videoId: String(entry["yt:videoId"] ?? ""),
      title: String(entry.title ?? ""),
      link: String(link?.["@_href"] ?? `https://www.youtube.com/watch?v=${entry["yt:videoId"]}`),
      published: String(entry.published ?? new Date().toISOString()),
      thumbnailUrl: thumbnail?.["@_url"],
    };
  });
}

export interface VideoIngestResult {
  channelId: string;
  fetched: number;
  error?: string;
}

export async function runVideoIngestion(): Promise<{ upserted: number; results: VideoIngestResult[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(url, serviceKey);

  const results: VideoIngestResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Record<string, any>[] = [];

  for (const source of VIDEO_SOURCES) {
    try {
      const entries = await fetchChannelVideos(source.channelId);
      for (const entry of entries.slice(0, MAX_VIDEOS_PER_CHANNEL)) {
        if (!entry.videoId || !entry.title) continue;
        const category = classifyVideo(entry.title);
        rows.push({
          slug: entry.videoId,
          category_key: category,
          content_type: "news",
          language: "ta",
          headline: entry.title,
          // No usable short description exists (YouTube's media:description
          // is a huge block of hashtags/SEO keywords, not a summary) — leave
          // it null rather than duplicating the headline as a fake "dek".
          dek: null,
          body: [],
          source: source.sourceLabel,
          source_url: entry.link,
          author: null,
          published_at: new Date(entry.published).toISOString(),
          has_video: true,
          video_url: entry.link,
          image_url: entry.thumbnailUrl ?? null,
          tags: [category, "video"],
        });
      }
      results.push({ channelId: source.channelId, fetched: entries.length });
    } catch (err) {
      results.push({ channelId: source.channelId, fetched: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("articles").upsert(rows, { onConflict: "category_key,slug" });
    if (error) throw error;
  }

  return { upserted: rows.length, results };
}

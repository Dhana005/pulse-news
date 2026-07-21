// Supabase Edge Function: pulls the latest videos from a handful of Tamil
// news YouTube channels' public RSS feeds (no API key needed) and upserts
// them into `articles` as has_video=true rows. Kept in sync by hand with
// src/lib/ingest/video.ts (Deno can't import the Next.js app's TS directly),
// same as the `ingest` function.
//
// Scheduled every 30 min via pg_cron (see
// supabase/migrations/0010_video_ingest.sql) — YouTube's feed has no rate
// limit like NewsData.io does.
//
// Deploy: paste this file's contents into the Supabase Dashboard's
// Edge Functions editor, or `supabase functions deploy ingest-video`.
// Secrets needed (Functions -> ingest-video -> Secrets): INGEST_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

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
  // deno-lint-ignore no-explicit-any
  const doc: any = parser.parse(xml);
  const entries = asArray(doc?.feed?.entry);

  // deno-lint-ignore no-explicit-any
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

  const results: { channelId: string; fetched: number; error?: string }[] = [];
  // deno-lint-ignore no-explicit-any
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
    if (error) {
      return new Response(JSON.stringify({ error: error.message, results }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ upserted: rows.length, results }), {
    headers: { "content-type": "application/json" },
  });
});

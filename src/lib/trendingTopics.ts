// Hand-curated trending-topic pills shown under the breaking ticker.
// `tags` on articles is currently just [category] (see src/lib/ingest/run.ts),
// too coarse to derive a real trending-topics row from — this is editorial,
// same as how most portals hand-pick this row. Swap for something
// algorithmic later if per-article keyword tagging gets added.

export interface TrendingTopic {
  label: string;
  icon: string;
  href: string;
}

export const TRENDING_TOPICS: TrendingTopic[] = [
  { label: "AI", icon: "🤖", href: "/ta/technology" },
  { label: "Crypto", icon: "🪙", href: "/ta/business" },
  { label: "IPL 2024", icon: "🏏", href: "/ta/sports" },
  { label: "தேர்தல்", icon: "🗳", href: "/ta/india" },
  { label: "தங்கம்", icon: "✨", href: "/ta/business" },
  { label: "Jobs", icon: "💼", href: "/ta/business" },
  { label: "சினிமா", icon: "🎬", href: "/ta/cinema" },
  { label: "வானிலை", icon: "☁", href: "/ta/tamilnadu" },
  { label: "பெட்ரோல்", icon: "⛽", href: "/ta/business" },
  { label: "பங்குச்சந்தை", icon: "📈", href: "/ta/business" },
];

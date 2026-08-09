export interface CategoryDef {
  key: string;
  label: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "tamilnadu", label: "தமிழகம்" },
  { key: "india", label: "இந்தியா" },
  { key: "politics", label: "அரசியல்" },
  { key: "world", label: "உலகம்" },
  { key: "business", label: "வணிகம்" },
  { key: "gold", label: "தங்கம் விலை" },
  { key: "technology", label: "தொழில்நுட்பம்" },
  { key: "sports", label: "விளையாட்டு" },
  { key: "cinema", label: "சினிமா" },
  { key: "lifestyle", label: "லைஃப் ஸ்டைல்" },
];

export const NAV_ITEMS = [{ key: "", label: "முகப்பு" }, ...CATEGORIES];

// Per-category Telegram channels (each channel's admin panel is managed
// outside this repo). "tamilnadu" maps to the flagship channel (no
// "...Tamilnadu" suffix exists) — reused as the site-wide link in the
// footer too.
export const TELEGRAM_CHANNELS: Record<string, string> = {
  tamilnadu: "https://t.me/PulseNewsTamil",
  india: "https://t.me/PulseNewsTamilIndia",
  world: "https://t.me/PulseNewsTamilWorld",
  sports: "https://t.me/PulseNewsTamilSports",
  cinema: "https://t.me/PulseNewsTamilCinema",
  business: "https://t.me/PulseNewsTamilBusiness",
  technology: "https://t.me/PulseNewsTamilTechnology",
  politics: "https://t.me/PulseNewsTamilPolitics",
  gold: "https://t.me/PulseNewsTamilGold",
  lifestyle: "https://t.me/PulseNewsTamilLifestyle",
};

export const MAIN_TELEGRAM_CHANNEL = TELEGRAM_CHANNELS.tamilnadu;

export function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function isValidCategory(key: string): boolean {
  return CATEGORIES.some((c) => c.key === key);
}

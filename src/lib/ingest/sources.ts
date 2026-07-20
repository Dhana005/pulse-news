// Verified working Tamil RSS feeds (checked by hand before wiring up —
// see conversation history). Two shapes:
//  - fixed-category feeds (Vikatan's per-section collections)
//  - a general feed (Oneindia Tamil) classified per item by its
//    `<category>` path, since Oneindia doesn't expose separate
//    category/section feeds for tamilnadu/india/sports.

export type ContentType = "news" | "cinema";

export interface FeedSource {
  url: string;
  sourceLabel: string;
  contentType: ContentType;
  // Returns the target category key, or null to skip the item.
  classify: (categories: string[]) => string | null;
}

const TN_CITY_TAGS = new Set([
  "chennai",
  "tamilnadu",
  "madurai",
  "tirupati",
  "coimbatore",
  "salem",
  "trichy",
  "tiruchirappalli",
  "tirunelveli",
  "vellore",
  "erode",
  "thanjavur",
  "madras",
]);

const NON_INDIA_CITY_TAGS = new Set(["singapore", "dubai", "london", "newyork", "colombo"]);

function classifyOneindia(categories: string[]): string | null {
  for (const raw of categories) {
    const cat = raw.toLowerCase();
    if (cat.startsWith("news/sports")) return "sports";
    if (cat.startsWith("news/international")) return "world";
    if (cat === "news/india") return "india";

    const cityMatch = cat.match(/^news\/([a-z]+)$/);
    if (cityMatch) {
      const city = cityMatch[1];
      if (TN_CITY_TAGS.has(city)) return "tamilnadu";
      if (NON_INDIA_CITY_TAGS.has(city)) return "world";
      return "india"; // other Indian metros -> national
    }
    if (cat === "news" || cat === "news/tamilnadu") return "tamilnadu";
  }
  return null; // astrology, weather, spirituality, recipes, date tags, etc.
}

const VIKATAN_PERIOD = "time-period=last-7-days";

export const FEED_SOURCES: FeedSource[] = [
  {
    url: `https://www.vikatan.com/api/v1/collections/india-news.rss?&${VIKATAN_PERIOD}`,
    sourceLabel: "விகடன்",
    contentType: "news",
    classify: () => "india",
  },
  {
    url: `https://www.vikatan.com/api/v1/collections/international.rss?&${VIKATAN_PERIOD}`,
    sourceLabel: "விகடன்",
    contentType: "news",
    classify: () => "world",
  },
  {
    url: `https://www.vikatan.com/api/v1/collections/sports-news.rss?&${VIKATAN_PERIOD}`,
    sourceLabel: "விகடன்",
    contentType: "news",
    classify: () => "sports",
  },
  {
    url: `https://www.vikatan.com/api/v1/collections/kollywood-entertainment.rss?&${VIKATAN_PERIOD}`,
    sourceLabel: "விகடன்",
    contentType: "cinema",
    classify: () => "cinema",
  },
  {
    url: "https://tamil.oneindia.com/rss/feeds/oneindia-tamil-fb.xml",
    sourceLabel: "Oneindia Tamil",
    contentType: "news",
    classify: classifyOneindia,
  },
];

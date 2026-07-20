// One-off seed: populates categories/articles/horoscopes with placeholder
// Tamil copy so the site has real DB-backed content to render immediately.
// Run with: npm run db:seed
// Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) — never used at request time.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — see .env.local.example.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const CATEGORIES = [
  { key: "tamilnadu", label: "தமிழகம்", sort_order: 1 },
  { key: "india", label: "இந்தியா", sort_order: 2 },
  { key: "world", label: "உலகம்", sort_order: 3 },
  { key: "sports", label: "விளையாட்டு", sort_order: 4 },
  { key: "cinema", label: "சினிமா", sort_order: 5 },
];

const HEADLINE_POOL: Record<string, string[]> = {
  tamilnadu: [
    "மாநிலத்தில் புதிய திட்ட அறிவிப்பு",
    "மாவட்ட நிர்வாகத்தின் முக்கிய அறிவிப்பு",
    "சாலை பணிகள் தொடர்பான புதுப்பிப்பு",
    "பள்ளி, கல்லூரிகளுக்கு அறிவிப்பு",
    "நகராட்சி நிர்வாகத்தின் புதிய நடவடிக்கை",
    "பொது மக்களுக்கான புதிய சேவை தொடக்கம்",
    "மாநில அரசின் நலத்திட்ட விரிவாக்கம்",
    "விவசாயிகளுக்கான புதிய உதவித் திட்டம்",
  ],
  india: [
    "நாடாளுமன்றத்தில் இன்றைய நிகழ்வுகள்",
    "மத்திய அரசின் புதிய கொள்கை",
    "பொருளாதார வளர்ச்சி குறித்த அறிக்கை",
    "தேசிய அளவில் முக்கிய நிகழ்வு",
    "நாடு தழுவிய முக்கிய நிகழ்வு குறித்த அறிக்கை",
    "மத்திய அமைச்சரவை கூட்டத்தில் முடிவுகள்",
    "புதிய தேசிய திட்டத்திற்கு ஒப்புதல்",
    "தேர்தல் ஆணையத்தின் அறிவிப்பு",
  ],
  world: [
    "சர்வதேச உச்சி மாநாட்டில் விவாதம்",
    "அண்டை நாட்டு உறவு குறித்த செய்தி",
    "உலக பொருளாதாரம் பற்றிய பார்வை",
    "காலநிலை மாற்றம் தொடர்பான அறிக்கை",
    "ஐக்கிய நாடுகள் சபையில் முக்கிய விவாதம்",
    "வர்த்தக ஒப்பந்தம் குறித்த பேச்சுவார்த்தை",
    "உலக நாடுகளின் கூட்டு அறிக்கை",
    "சர்வதேச விளையாட்டு நிகழ்வு அறிவிப்பு",
  ],
  sports: [
    "இன்றைய போட்டியின் முடிவுகள்",
    "வீரர் தேர்வு குறித்த அறிவிப்பு",
    "தொடரின் அடுத்த கட்டம் அறிவிப்பு",
    "இளம் வீரர்களுக்கு பயிற்சி முகாம்",
    "இன்றைய போட்டியின் சிறப்பு தருணங்கள்",
    "அணித் தலைவர் அறிவிப்பு வெளியானது",
    "சாம்பியன்ஷிப் இறுதிப் போட்டி அட்டவணை",
    "காயம் காரணமாக வீரர் விலகல்",
  ],
  cinema: [
    "புதிய படத்தின் டீசர் வெளியீடு",
    "இயக்குநரின் அடுத்த திட்ட அறிவிப்பு",
    "விருது விழா குறித்த செய்தி",
    "படப்பிடிப்பு தொடங்கியது",
    "புதிய படத்தின் அறிவிப்பு வெளியானது",
    "பட இசை வெளியீட்டு விழா அறிவிப்பு",
    "நடிகர் நடிகையர் புதிய படக்குழு அறிவிப்பு",
    "படத்தின் வெளியீட்டு தேதி உறுதி",
  ],
};

const DEK = "இந்த செய்தியின் சுருக்கமான விளக்கம் இங்கே ஒரு வரியில் இடம்பெறும்.";

const BODY_PARAS = [
  "செய்தியின் முதல் பத்தி இங்கே இடம்பெறும். நிகழ்வின் பின்னணி மற்றும் முக்கிய தகவல்கள் இதில் விளக்கப்படும்.",
  "இரண்டாவது பத்தியில் கூடுதல் விவரங்கள், சம்பந்தப்பட்டவர்களின் கருத்துகள் இடம்பெறும்.",
  "மூன்றாவது பத்தி இந்த நிகழ்வின் தாக்கம் மற்றும் அடுத்த கட்ட நடவடிக்கைகள் குறித்து விளக்கும்.",
  "இறுதிப் பத்தியில் தொடர்புடைய பின்னணி தகவல்கள் மற்றும் மேலதிக விவரங்களுக்கான குறிப்புகள் இடம்பெறும்.",
];

const SOURCES = ["பதிவு A", "பதிவு B", "பதிவு C", "பதிவு D"];

const RASHIS = [
  "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
  "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்",
];

const RASHI_TEXT =
  "இன்றைய தினம் நல்ல வாய்ப்புகள் உங்களை தேடி வரும். பொருளாதார ரீதியாக கவனமாக இருங்கள். குடும்பத்தினருடன் நேரம் செலவிடுவது நல்ல பலனைத் தரும். ஆரோக்கியத்தில் சிறு கவனம் தேவை.";

function articlesFor(categoryKey: string) {
  const pool = HEADLINE_POOL[categoryKey];
  const now = Date.now();
  return pool.map((headline, i) => ({
    slug: `${categoryKey}-${i}`,
    category_key: categoryKey,
    content_type: categoryKey === "cinema" ? "cinema" : "news",
    language: "ta",
    headline,
    dek: DEK,
    body: BODY_PARAS,
    source: SOURCES[i % SOURCES.length],
    author: SOURCES[i % SOURCES.length],
    published_at: new Date(now - i * 12 * 60 * 1000).toISOString(),
    has_video: i % 5 === 0,
    video_url: null,
    tags: [categoryKey, "செய்தி", "புதுப்பிப்பு", "இன்று"],
  }));
}

async function main() {
  console.log("Seeding categories...");
  const { error: catErr } = await supabase.from("categories").upsert(CATEGORIES);
  if (catErr) throw catErr;

  console.log("Seeding articles...");
  for (const cat of CATEGORIES) {
    const { error } = await supabase
      .from("articles")
      .upsert(articlesFor(cat.key), { onConflict: "category_key,slug" });
    if (error) throw error;
    console.log(`  ${cat.key}: ${HEADLINE_POOL[cat.key].length} articles`);
  }

  console.log("Seeding today's horoscope readings...");
  const today = new Date().toISOString().slice(0, 10);
  const readings = RASHIS.map((rashiName, i) => ({
    rashi_key: rashiName,
    rashi_name: rashiName,
    reading_date: today,
    reading_text: RASHI_TEXT,
    sort_order: i,
  }));
  const { error: horoErr } = await supabase
    .from("horoscopes")
    .upsert(readings, { onConflict: "rashi_key,reading_date" });
  if (horoErr) throw horoErr;

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

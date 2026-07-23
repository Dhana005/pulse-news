// On-page SEO copy for the Tamil edition (home + category pages), sourced
// from the SEO tracking sheet: https://docs.google.com/spreadsheets/d/1NdDR8KrsExU-6qY4WD-lpuR0ihLX9fpl_3fr2c8HDrg
// (tab "Optimized Meta Tags", updated 23/07/2026). Kept separate from
// categories.ts's nav labels (getCategoryLabel) since the H1/title copy here
// is deliberately longer/keyword-bearing and shouldn't affect the
// header/breadcrumb text.

export interface PageSeo {
  title: string;
  description: string;
  h1: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
}

export const HOME_SEO: PageSeo = {
  title: "தமிழ் செய்திகள் | Tamil News | Latest Tamil News Live | Pulse News",
  description:
    "Pulse News-ல் தமிழகம், இந்தியா, உலகம், அரசியல், சினிமா, விளையாட்டு, வணிகம், தொழில்நுட்பம் உள்ளிட்ட அனைத்து தமிழ் செய்திகளையும் உடனுக்குடன் படிக்கலாம். Read the latest Tamil News Today and Breaking News Live.",
  h1: "Pulse News தமிழ் செய்திகள் | தமிழ் செய்திகள் இன்று",
  keywords: ["தமிழ் செய்திகள்", "Tamil News Today", "Latest Tamil News", "Breaking Tamil News", "Tamil News Live"],
  ogTitle: "Pulse News தமிழ் செய்திகள் | Latest Tamil News Today",
  ogDescription:
    "Read the latest Tamil News, Breaking News, Tamil Nadu, India, World, Business, Sports and Technology updates on Pulse News.",
};

export const CATEGORY_SEO: Record<string, PageSeo> = {
  tamilnadu: {
    title: "தமிழக செய்திகள் | Tamil Nadu News Today | Pulse News",
    description:
      "தமிழகத்தின் சென்னை, கோயம்புத்தூர், மதுரை, திருச்சி மற்றும் அனைத்து மாவட்டங்களின் முக்கிய செய்திகளை உடனுக்குடன் படிக்கலாம்.",
    h1: "தமிழக செய்திகள் | Tamil Nadu News Today",
    keywords: ["தமிழக செய்திகள்", "Tamil Nadu News", "Chennai News", "District News"],
    ogTitle: "Tamil Nadu News Today | Pulse News",
    ogDescription: "Latest Tamil Nadu News, Chennai News and district-wise breaking updates.",
  },
  india: {
    title: "இந்தியா செய்திகள் | India News Tamil | Pulse News",
    description: "இந்தியாவின் அரசியல், பொருளாதாரம், நீதிமன்றம், பாதுகாப்பு மற்றும் தேசிய முக்கிய செய்திகளை தமிழில் படிக்கலாம்.",
    h1: "இந்தியா செய்திகள்",
    keywords: ["India News Tamil", "இந்தியா செய்திகள்", "National News"],
    ogTitle: "India News Tamil | Pulse News",
    ogDescription: "Latest India News, politics, economy and national updates in Tamil.",
  },
  world: {
    title: "உலக செய்திகள் | World News Tamil | Pulse News",
    description: "அமெரிக்கா, சீனா, ரஷ்யா, ஐரோப்பா மற்றும் உலக நாடுகளின் முக்கிய செய்திகளை தமிழில் அறியுங்கள்.",
    h1: "உலக செய்திகள்",
    keywords: ["World News Tamil", "உலக செய்திகள்", "International News"],
    ogTitle: "World News Tamil | Pulse News",
    ogDescription: "Read the latest world news, global politics and international updates in Tamil.",
  },
  business: {
    title: "வணிக செய்திகள் | Business News Tamil | Pulse News",
    description:
      "பங்குச்சந்தை, தங்கம் விலை, வெள்ளி விலை, பொருளாதாரம், கிரிப்டோகரன்சி மற்றும் வணிகச் செய்திகளை தமிழில் படிக்கலாம்.",
    h1: "வணிக செய்திகள்",
    keywords: ["Business News Tamil", "Gold Rate Tamil", "Share Market Tamil", "Crypto News"],
    ogTitle: "Business News Tamil | Pulse News",
    ogDescription: "Latest business news, stock market, gold price, cryptocurrency and economy updates.",
  },
  technology: {
    title: "தொழில்நுட்ப செய்திகள் | Technology News Tamil | Pulse News",
    description:
      "AI, மொபைல், கேஜெட்கள், சைபர் பாதுகாப்பு, புதிய தொழில்நுட்பங்கள் மற்றும் டிஜிட்டல் உலகச் செய்திகளை தமிழில் படிக்கலாம்.",
    h1: "தொழில்நுட்ப செய்திகள்",
    keywords: ["Technology News Tamil", "AI News Tamil", "Gadget News"],
    ogTitle: "Technology News Tamil | Pulse News",
    ogDescription: "Latest AI, gadgets, mobile launches, apps and technology news in Tamil.",
  },
  sports: {
    title: "விளையாட்டு செய்திகள் | Sports News Tamil | Pulse News",
    description:
      "கிரிக்கெட், IPL, கால்பந்து, டென்னிஸ், கபடி மற்றும் அனைத்து விளையாட்டு செய்திகளையும் நேரடி அப்டேட்களுடன் படிக்கலாம்.",
    h1: "விளையாட்டு செய்திகள்",
    keywords: ["Sports News Tamil", "Cricket News Tamil", "IPL News Tamil"],
    ogTitle: "Sports News Tamil | Pulse News",
    ogDescription: "Latest cricket, IPL, football and sports news with live updates in Tamil.",
  },
  cinema: {
    title: "சினிமா செய்திகள் | Tamil Cinema News Today | Pulse News",
    description:
      "கோலிவுட், திரைப்பட செய்திகள், OTT வெளியீடுகள், நடிகர் நடிகைகள், திரைப்பட விமர்சனங்கள் மற்றும் பொழுதுபோக்கு செய்திகள்.",
    h1: "சினிமா செய்திகள்",
    keywords: ["Tamil Cinema News", "Kollywood News", "Movie News Tamil"],
    ogTitle: "Tamil Cinema News | Pulse News",
    ogDescription: "Latest Kollywood news, movie reviews, OTT releases and celebrity updates in Tamil.",
  },
  lifestyle: {
    title: "வாழ்க்கை முறை செய்திகள் | Lifestyle News Tamil | Pulse News",
    description:
      "உணவு, பயணம், ஃபேஷன், அழகு, குடும்பம், ஆரோக்கியம் மற்றும் தினசரி வாழ்க்கை தொடர்பான செய்திகள் மற்றும் குறிப்புகள்.",
    h1: "வாழ்க்கை முறை செய்திகள்",
    keywords: ["Lifestyle News Tamil", "Health Tips Tamil", "Food News Tamil"],
    ogTitle: "Lifestyle News Tamil | Pulse News",
    ogDescription: "Read lifestyle news, food, travel, fashion, beauty and wellness tips in Tamil.",
  },
};

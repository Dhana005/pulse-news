import PlaceholderMedia from "./PlaceholderMedia";

// Sample placeholder content — no columnist/opinion content type exists yet
// (articles.content_type only allows 'news'/'cinema', see
// supabase/migrations/0001_init.sql). Swap SAMPLE_PICKS for real data once
// an opinion/columnist content pipeline exists.
const SAMPLE_PICKS = [
  { tag: "கருத்துக் கட்டுரை", name: "ஆசிரியர் குழு", headline: "இந்திய பொருளாதாரத்தின் எதிர்காலம் எப்படி இருக்கும்?" },
  { tag: "கருத்து", name: "கார்த்திக் வர்மா", headline: "கல்வி கொள்கை மாற்றத்தால் மாணவர்களுக்கு பயனாகுமா?" },
  { tag: "புதைபடம் தூரம்", name: "பாரதி ராமன்", headline: "நாடாளுமன்று தேர்தல் — வெற்றி பெறுவார்யார்?" },
];

export default function EditorsPicksSection() {
  return (
    <section id="editors-picks" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">எடிட்டரின் தேர்வு</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {SAMPLE_PICKS.map((pick) => (
          <div key={pick.headline} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <PlaceholderMedia className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11.5px] font-bold text-accent">{pick.tag}</span>
                <span className="text-[13px] font-semibold truncate">{pick.name}</span>
              </div>
            </div>
            <span className="text-[14.5px] font-semibold leading-[1.4]">{pick.headline}</span>
          </div>
        ))}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] text-center leading-tight"
              style={{ background: "#d32f2f", color: "#fff" }}
            >
              FACT<br />CHECK
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11.5px] font-bold" style={{ color: "#d32f2f" }}>
                Fact Check
              </span>
              <span className="text-[13px] font-semibold">Pulse Fact Check Team</span>
            </div>
          </div>
          <span className="text-[14.5px] font-semibold leading-[1.4]">வைரலாகும் தகவலின் உண்மை என்ன?</span>
        </div>
      </div>
    </section>
  );
}

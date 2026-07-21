import PlaceholderMedia from "./PlaceholderMedia";

// Sample placeholder content — the aggregator model (see src/lib/data.ts's
// Article.sourceUrl comment) doesn't ingest or host video, so there's no
// real video content source yet. Swap SAMPLE_VIDEOS for real data once one
// exists.
const SAMPLE_VIDEOS = [
  { headline: "சென்னையில் கனமழை — சாலைகளில் தேக்கம்", duration: "03:20", time: "20 நிமிடம் முன்" },
  { headline: "ISRO புதிய ஏவுகணை சோதனை வெற்றி", duration: "02:15", time: "35 நிமிடம் முன்" },
  { headline: "IPL 2024: இன்றைய போட்டி முன்னோட்டம்", duration: "01:45", time: "2 மணி நேரம் முன்" },
  { headline: "பங்குச்சந்தை நிலவரம் — வல்லுநர் பார்வை", duration: "02:30", time: "45 நிமிடம் முன்" },
];

function PlayBadge({ duration }: { duration: string }) {
  return (
    <>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.25)" }}
        aria-hidden="true"
      >
        <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.92)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        </span>
      </span>
      <span
        className="absolute bottom-2 right-2 text-[11px] font-semibold px-1.5 py-0.5 rounded"
        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
      >
        {duration}
      </span>
    </>
  );
}

export default function VideoNewsSection() {
  const [featured, ...rest] = SAMPLE_VIDEOS;

  return (
    <section id="video-news" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">வீடியோ செய்திகள்</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-5 md:gap-7">
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <PlaceholderMedia className="h-[200px] md:h-[260px] w-full" />
            <PlayBadge duration={featured.duration} />
          </div>
          <span className="text-[15px] md:text-[16px] font-semibold leading-[1.4]">{featured.headline}</span>
          <span className="text-[12.5px] text-text-faint">{featured.time}</span>
        </div>
        <div className="flex flex-col gap-3.5">
          {rest.map((v) => (
            <div key={v.headline} className="flex gap-3 items-start">
              <div className="relative shrink-0 w-[92px] h-[64px]">
                <PlaceholderMedia className="w-full h-full" />
                <span
                  className="absolute bottom-1 right-1 text-[10px] font-semibold px-1 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                >
                  {v.duration}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[13.5px] font-semibold leading-[1.4]">{v.headline}</span>
                <span className="text-[12px] text-text-faint">{v.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

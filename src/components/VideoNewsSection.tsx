import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getVideoArticles } from "@/lib/data";

// No duration badge — getting exact runtime requires either a YouTube Data
// API key or scraping each watch page's full ytInitialPlayerResponse
// (~700KB+ per video just to find it), too heavy for a cosmetic detail.
function PlayBadge({ size = "lg" }: { size?: "lg" | "sm" }) {
  const circle = size === "lg" ? "w-11 h-11" : "w-6 h-6";
  const icon = size === "lg" ? 16 : 9;
  return (
    <span
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.25)" }}
      aria-hidden="true"
    >
      <span className={`${circle} rounded-full flex items-center justify-center`} style={{ background: "rgba(255,255,255,0.92)" }}>
        <svg width={icon} height={icon} viewBox="0 0 24 24" fill="var(--accent)">
          <polygon points="6,4 20,12 6,20" />
        </svg>
      </span>
    </span>
  );
}

export default async function VideoNewsSection() {
  const videos = await getVideoArticles(4);
  if (videos.length === 0) return null;
  const [featured, ...rest] = videos;

  return (
    <section id="video-news" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">வீடியோ செய்திகள்</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-5 md:gap-7">
        <Link href={`/ta/${featured.category}/${featured.slug}`} className="flex flex-col gap-2.5">
          <div className="relative">
            <ArticleMedia imageUrl={featured.imageUrl} alt={featured.headline} className="h-[200px] md:h-[260px] w-full" />
            <PlayBadge />
          </div>
          <span className="text-[15px] md:text-[16px] font-semibold leading-[1.4]">{featured.headline}</span>
          <span className="text-[12.5px] text-text-faint">{featured.publishedAgo}</span>
        </Link>
        <div className="flex flex-col gap-3.5">
          {rest.map((v) => (
            <Link key={v.slug} href={`/ta/${v.category}/${v.slug}`} className="flex gap-3 items-start">
              <div className="relative shrink-0 w-[92px] h-[64px]">
                <ArticleMedia imageUrl={v.imageUrl} alt={v.headline} className="w-full h-full" />
                <PlayBadge size="sm" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[13.5px] font-semibold leading-[1.4]">{v.headline}</span>
                <span className="text-[12px] text-text-faint">{v.publishedAgo}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

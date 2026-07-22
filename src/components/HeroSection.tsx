import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import PlaceholderMedia from "./PlaceholderMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function HeroSection({ lead, side }: { lead: Article; side: Article[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col lg:flex-row mb-10 md:mb-13">
      <Link href={`/ta/${lead.category}/${lead.slug}`} className="relative block h-[300px] lg:h-[460px] lg:flex-[1.6] lg:min-w-0">
        <ArticleMedia imageUrl={lead.imageUrl} alt={lead.headline} className="h-full w-full" rounded={false} />

        <span
          className="absolute top-4 left-4 text-[12.5px] font-bold px-3.5 py-1.5 rounded-full"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {getCategoryLabel(lead.category)}
        </span>
        <span
          aria-label="சேமி"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
          style={{ background: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <path d="M6 3h12v18l-6-4.5L6 21V3z" />
          </svg>
        </span>

        <div
          className="absolute inset-x-0 bottom-0 px-5 md:px-6 pt-14 pb-5 flex flex-col gap-2.5"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.55) 60%, transparent)" }}
        >
          {/* h2, not h1 — the homepage's h1 is the page-level heading in
          page.tsx; this is one story's headline, not the page's topic. */}
          <h2 className="text-[22px] sm:text-[26px] md:text-[30px] leading-[1.3] font-bold m-0 -tracking-[0.01em] text-white">
            {lead.headline}
          </h2>
          {lead.dek && (
            <p className="hidden sm:block text-[14px] md:text-[15px] leading-[1.6] m-0 max-w-[60ch]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {lead.dek}
            </p>
          )}
          <div className="flex items-center gap-2.5 mt-0.5">
            <PlaceholderMedia className="w-6 h-6 rounded-full shrink-0" />
            <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {lead.author || "Pulse News Desk"} · {lead.publishedAgo}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-col divide-y divide-border lg:h-[460px] lg:flex-1 lg:min-w-0">
        {side.map((item) => (
          <Link
            key={item.slug}
            href={`/ta/${item.category}/${item.slug}`}
            className="flex-1 flex gap-3.5 items-center px-5 py-4"
          >
            <ArticleMedia imageUrl={item.imageUrl} alt={item.headline} className="w-[92px] h-[70px] shrink-0" rounded />
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11.5px] font-bold text-accent">{getCategoryLabel(item.category)}</span>
              <span className="text-[14.5px] font-semibold leading-[1.4]">{item.headline}</span>
              <span className="text-[12px] text-text-faint">{item.publishedAgo}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

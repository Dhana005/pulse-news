import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function HeroSection({ lead, side }: { lead: Article; side: Article[] }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 md:gap-9 mb-10 md:mb-13">
      <Link href={`/ta/${lead.category}/${lead.slug}`} className="flex flex-col gap-4 md:gap-[18px]">
        <ArticleMedia imageUrl={lead.imageUrl} alt={lead.headline} className="h-[220px] sm:h-[300px] md:h-[360px]" />
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5px] font-bold px-2.5 py-1 rounded" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            {getCategoryLabel(lead.category)}
          </span>
          <span className="text-[13px] text-text-faint">மூலம்: {lead.source} · {lead.publishedAgo}</span>
        </div>
        <h1 className="text-[28px] sm:text-[36px] md:text-[44px] leading-[1.28] font-bold m-0 -tracking-[0.01em]">
          {lead.headline}
        </h1>
        <p className="text-[15.5px] md:text-[16.5px] leading-[1.6] text-text-muted m-0 max-w-[56ch]">{lead.dek}</p>
      </Link>

      <div className="flex flex-col gap-5">
        {side.map((item) => (
          <Link
            key={item.slug}
            href={`/ta/${item.category}/${item.slug}`}
            className="flex gap-3.5 items-start pb-5 border-b border-border"
          >
            <ArticleMedia imageUrl={item.imageUrl} alt={item.headline} className="w-[88px] h-[66px] shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11.5px] font-bold text-accent">{getCategoryLabel(item.category)}</span>
              <span className="text-[15.5px] font-semibold leading-[1.4]">{item.headline}</span>
              <span className="text-[12.5px] text-text-faint">மூலம்: {item.source} · {item.publishedAgo}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

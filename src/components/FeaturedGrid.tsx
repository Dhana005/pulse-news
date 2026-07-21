import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function FeaturedGrid({ articles }: { articles: Article[] }) {
  const [large1, large2, ...rest] = articles;
  const small = rest.slice(0, 4);

  return (
    <section className="mb-9 md:mb-12">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">சம்பத்திய செய்திகள்</h2>
        <Link href="/ta/tamilnadu" className="text-[13.5px] font-semibold text-accent whitespace-nowrap">
          அனைத்தையும் பார்க்க →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        {[large1, large2].filter(Boolean).map((art) => (
          <Link key={art.slug} href={`/ta/${art.category}/${art.slug}`} className="flex flex-col gap-2.5">
            <div className="relative">
              <ArticleMedia imageUrl={art.imageUrl} alt={art.headline} className="h-[190px] md:h-[210px]" />
              <span
                className="absolute top-2.5 left-2.5 text-[11.5px] font-bold px-2.5 py-1 rounded"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {getCategoryLabel(art.category)}
              </span>
            </div>
            <span className="text-[16px] md:text-[18px] font-bold leading-[1.35]">{art.headline}</span>
            <span className="text-[12.5px] text-text-faint">{art.publishedAgo}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {small.map((art) => (
          <Link key={art.slug} href={`/ta/${art.category}/${art.slug}`} className="flex flex-col gap-2">
            <ArticleMedia imageUrl={art.imageUrl} alt={art.headline} className="h-[100px] md:h-[120px]" />
            <span className="text-[13.5px] md:text-[14.5px] font-semibold leading-[1.4]">{art.headline}</span>
            <span className="text-[12px] text-text-faint">{art.publishedAgo}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

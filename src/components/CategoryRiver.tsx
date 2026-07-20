import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function CategoryRiver({ category, articles }: { category: string; articles: Article[] }) {
  return (
    <section className="mb-9 md:mb-12">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">{getCategoryLabel(category)}</h2>
        <Link href={`/ta/${category}`} className="text-[13.5px] font-semibold text-accent whitespace-nowrap">
          மேலும் காண →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {articles.map((art) => (
          <Link key={art.slug} href={`/ta/${art.category}/${art.slug}`} className="flex flex-col gap-2.5">
            <ArticleMedia imageUrl={art.imageUrl} alt={art.headline} className="h-[110px] md:h-[140px]" />
            <span className="text-[14.5px] md:text-[16px] font-semibold leading-[1.4]">{art.headline}</span>
            <span className="text-[12px] md:text-[12.5px] text-text-faint">மூலம்: {art.source} · {art.publishedAgo}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

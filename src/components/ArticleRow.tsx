import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function ArticleRow({ article }: { article: Article }) {
  return (
    <Link
      href={`/ta/${article.category}/${article.slug}`}
      className="flex gap-4 md:gap-5 py-4 md:py-5 border-b border-border items-start"
    >
      <ArticleMedia
        imageUrl={article.imageUrl}
        alt={article.headline}
        className="w-[110px] h-[80px] md:w-[220px] md:h-[150px] shrink-0"
      />
      <div className="flex flex-col gap-1.5 md:gap-2 min-w-0 flex-1">
        <span className="text-[11.5px] md:text-[12px] font-bold text-accent">{getCategoryLabel(article.category)}</span>
        <span className="text-[15.5px] md:text-[19px] font-semibold leading-[1.4]">{article.headline}</span>
        {article.dek && <span className="hidden md:block text-[14.5px] leading-[1.6] text-text-muted">{article.dek}</span>}
        <span className="text-[12px] md:text-[12.5px] text-text-faint">{article.publishedAgo}</span>
      </div>
    </Link>
  );
}

import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/data";

export default function CategoryRiver({ category, articles }: { category: string; articles: Article[] }) {
  const [lead, ...bullets] = articles;
  if (!lead) return null;

  return (
    <div className="flex flex-col gap-3.5 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-bold m-0">{getCategoryLabel(category)}</h2>
        <Link href={`/ta/${category}`} className="text-[12px] font-semibold text-accent whitespace-nowrap">
          அனைத்தையும் பார்க்க →
        </Link>
      </div>
      <Link href={`/ta/${lead.category}/${lead.slug}`} className="flex flex-col gap-2">
        <ArticleMedia imageUrl={lead.imageUrl} alt={lead.headline} className="h-[110px] md:h-[130px]" />
        <span className="text-[14px] md:text-[15px] font-semibold leading-[1.4]">{lead.headline}</span>
      </Link>
      <ul className="flex flex-col gap-2 m-0 pl-0 list-none">
        {bullets.slice(0, 3).map((art) => (
          <li key={art.slug}>
            <Link href={`/ta/${art.category}/${art.slug}`} className="flex gap-2 items-start text-[13px] leading-[1.5] text-text-muted">
              <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-text-faint" aria-hidden="true" />
              {art.headline}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import type { Article } from "@/lib/data";

export default function RelatedList({ items }: { items: Article[] }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold mb-3.5 m-0">தொடர்புடைய செய்திகள்</h3>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Link key={item.slug} href={`/ta/${item.category}/${item.slug}`} className="flex gap-3 items-start">
            <ArticleMedia imageUrl={item.imageUrl} alt={item.headline} className="w-[76px] h-[58px] shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[14.5px] font-semibold leading-[1.4]">{item.headline}</span>
              <span className="text-[12px] text-text-faint">{item.publishedAgo}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

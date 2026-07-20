import Link from "next/link";
import type { Article } from "@/lib/data";

export default function TrendingList({ items }: { items: Article[] }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold mb-3.5 m-0">டிரெண்டிங்</h3>
      <div className="flex flex-col gap-3.5">
        {items.map((item, i) => (
          <Link key={item.slug} href={`/ta/${item.category}/${item.slug}`} className="flex gap-3 items-baseline">
            <span className="font-brand font-bold text-[16px] text-accent shrink-0">{i + 1}</span>
            <span className="text-[14.5px] font-semibold leading-[1.4]">{item.headline}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

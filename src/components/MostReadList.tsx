import Link from "next/link";
import type { Article } from "@/lib/data";

export default function MostReadList({ items }: { items: Article[] }) {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-5">
      <h3 className="text-[15px] font-bold mb-3.5 m-0">மிகவும் படிக்கப்பட்டவை</h3>
      <div className="flex flex-col gap-3.5">
        {items.map((item, i) => (
          <Link key={item.slug} href={`/ta/${item.category}/${item.slug}`} className="flex gap-3 items-start">
            <span
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-semibold leading-[1.4]">{item.headline}</span>
              <span className="text-[12px] text-text-faint">{item.publishedAgo}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { TRENDING_TOPICS } from "@/lib/trendingTopics";

export default function TrendingTopics() {
  return (
    <section className="mb-9 md:mb-12">
      <h2 className="text-[13px] font-bold text-text-faint mb-3.5 m-0">டிரெண்டிங் டாபிக்ஸ்</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {TRENDING_TOPICS.map((topic) => (
          <Link
            key={topic.label}
            href={topic.href}
            className="flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full border border-border text-[13.5px] font-semibold hover:border-accent transition-colors"
          >
            <span aria-hidden="true">{topic.icon}</span>
            {topic.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

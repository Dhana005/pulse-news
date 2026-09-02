"use client";

import { useState } from "react";
import ArticleRow from "./ArticleRow";
import type { Article } from "@/lib/data";

export default function ArticleList({
  category,
  initialArticles,
  initialHasMore,
}: {
  category: string;
  initialArticles: Article[];
  initialHasMore: boolean;
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    const res = await fetch(`/api/articles?category=${category}&page=${nextPage}`);
    const json = await res.json();
    setArticles((prev) => [...prev, ...json.articles]);
    setHasMore(json.hasMore);
    setPage(nextPage);
    setLoading(false);
  }

  if (articles.length === 0) {
    return (
      <p className="text-[14.5px] text-text-muted py-8">
        இந்தப் பிரிவில் தற்போது கட்டுரைகள் இல்லை. விரைவில் புதிய கட்டுரைகள் வெளியிடப்படும்.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col">
        {articles.map((article) => (
          <ArticleRow key={article.slug} article={article} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-6 px-6 py-3 rounded-lg border border-border bg-surface text-text font-semibold text-[15px] cursor-pointer disabled:opacity-60"
        >
          {loading ? "ஏற்றுகிறது…" : "மேலும் ஏற்று"}
        </button>
      )}
    </div>
  );
}

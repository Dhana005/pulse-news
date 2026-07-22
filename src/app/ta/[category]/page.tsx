import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleList from "@/components/ArticleList";
import HoroscopeTeaser from "@/components/HoroscopeTeaser";
import TrendingList from "@/components/TrendingList";
import { CATEGORIES, getCategoryLabel, isValidCategory } from "@/lib/categories";
import { getTrending, getCategoryArticles } from "@/lib/data";
import { CATEGORY_SEO } from "@/lib/seo";

const PAGE_SIZE = 6;

export const revalidate = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.key }));
}

type Params = Promise<{ category: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const seo = CATEGORY_SEO[category];
  if (!seo) return { title: `${getCategoryLabel(category)} — PulseNews` };
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  if (!isValidCategory(category)) notFound();
  const label = getCategoryLabel(category);
  const [initialArticles, trending] = await Promise.all([
    getCategoryArticles(category, PAGE_SIZE),
    getTrending(),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header activeKey={category} />
      <main className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-14 md:pb-[70px] grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 md:gap-12 flex-1">
        <div>
          <div className="text-[13.5px] text-text-faint mb-2.5">
            <Link href="/ta" className="text-accent font-semibold">
              முகப்பு
            </Link>{" "}
            / {label}
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold m-0 mb-5 md:mb-6">
            {CATEGORY_SEO[category]?.h1 ?? label}
          </h1>
          <ArticleList
            category={category}
            initialArticles={initialArticles}
            initialHasMore={initialArticles.length === PAGE_SIZE}
          />
        </div>
        <aside className="flex flex-col gap-7 md:gap-8">
          <HoroscopeTeaser />
          <TrendingList items={trending} />
        </aside>
      </main>
      <Footer />
    </div>
  );
}

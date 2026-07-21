import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleRow from "@/components/ArticleRow";
import { searchArticles } from "@/lib/data";

type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `"${q}" — தேடல் முடிவுகள் — PulseNews` : "தேடல் — PulseNews" };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchArticles(q) : [];

  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[22px] md:text-[28px] font-bold m-0 mb-1.5">
          {q.trim() ? `"${q}" க்கான தேடல் முடிவுகள்` : "தேடல்"}
        </h1>
        <p className="text-[14px] text-text-faint m-0 mb-6">{results.length} செய்திகள் கிடைத்தன</p>
        {results.length === 0 ? (
          <p className="text-[15px] text-text-muted">பொருந்தக்கூடிய செய்திகள் எதுவும் இல்லை.</p>
        ) : (
          <div className="flex flex-col">
            {results.map((article) => (
              <ArticleRow key={`${article.category}-${article.slug}`} article={article} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

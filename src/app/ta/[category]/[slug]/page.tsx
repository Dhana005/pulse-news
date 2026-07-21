import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaceholderMedia from "@/components/PlaceholderMedia";
import ArticleMedia from "@/components/ArticleMedia";
import RelatedList from "@/components/RelatedList";
import ViewTracker from "@/components/ViewTracker";
import { getCategoryLabel, isValidCategory } from "@/lib/categories";
import { getArticle, getRelated } from "@/lib/data";

type Params = Promise<{ category: string; slug: string }>;

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, slug } = await params;
  const article = await getArticle(category, slug);
  return { title: article ? `${article.headline} — PulseNews` : "PulseNews" };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { category, slug } = await params;
  if (!isValidCategory(category)) notFound();
  const article = await getArticle(category, slug);
  if (!article) notFound();

  const label = getCategoryLabel(category);
  const related = await getRelated(category, slug);

  return (
    <div className="flex flex-col flex-1">
      <ViewTracker category={category} slug={slug} />
      <Header activeKey={category} />
      <main className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-14 md:pb-[70px] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 md:gap-12 flex-1">
        <article className="min-w-0">
          <div className="text-[13.5px] text-text-faint mb-3.5">
            <Link href="/ta" className="text-accent font-semibold">
              முகப்பு
            </Link>{" "}
            /{" "}
            <Link href={`/ta/${category}`} className="text-accent font-semibold">
              {label}
            </Link>
          </div>

          <span
            className="text-[12.5px] font-bold px-2.5 py-1 rounded"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {label}
          </span>
          <h1 className="text-[26px] md:text-[38px] leading-[1.3] font-bold m-0 mt-4 mb-3.5 -tracking-[0.01em]">
            {article.headline}
          </h1>
          {article.dek && (
            <p className="text-[15.5px] md:text-[17px] leading-[1.6] text-text-muted m-0 mb-4.5 max-w-[60ch]">
              {article.dek}
            </p>
          )}

          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
            <PlaceholderMedia className="w-[38px] h-[38px] rounded-full shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold">{article.author}</span>
              <span className="text-[12.5px] text-text-faint">{article.publishedAgo} · புதுப்பிக்கப்பட்டது</span>
            </div>
            <div className="flex-1" />
            <div className="hidden sm:flex gap-2.5">
              {["✉", "↗", "⚑"].map((ic) => (
                <button
                  key={ic}
                  aria-label="பகிர்"
                  className="w-[34px] h-[34px] rounded-full border border-border flex items-center justify-center text-text-muted cursor-pointer"
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {article.hasVideo ? (
            article.videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video controls className="w-full rounded-[10px] mb-6 bg-black" src={article.videoUrl} />
            ) : (
              <div className="h-[260px] md:h-[400px] rounded-[10px] mb-6 bg-surface border border-dashed border-border flex flex-col items-center justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "var(--accent)" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--accent-text)">
                    <polygon points="6,4 20,12 6,20" />
                  </svg>
                </div>
                <span className="font-mono text-[12px] text-text-faint mt-3">video placeholder — drop clip here</span>
              </div>
            )
          ) : (
            <ArticleMedia imageUrl={article.imageUrl} alt={article.headline} className="h-[220px] md:h-[400px] mb-6" />
          )}

          {article.sourceUrl ? (
            <div className="flex flex-col gap-4">
              {article.dek && <p className="text-[15.5px] md:text-[17px] leading-[1.7] text-text-muted m-0">{article.dek}</p>}
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 self-start px-5 py-3 rounded-lg font-semibold text-[15px]"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {article.source}-இல் முழு செய்தியைப் படிக்க →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-5 text-[15.5px] md:text-[17px] leading-[1.85]">
              {article.bodyParas.map((p, i) => (
                <p key={i} className="m-0">
                  {p}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2.5 flex-wrap mt-8 pt-5 border-t border-border">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-surface border border-border text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </article>

        <aside>
          <RelatedList items={related} />
        </aside>
      </main>
      <Footer />
    </div>
  );
}

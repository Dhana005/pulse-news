import type { Metadata } from "next";
import Header from "@/components/Header";
import BreakingTicker from "@/components/BreakingTicker";
import HeroSection from "@/components/HeroSection";
import TrendingTopics from "@/components/TrendingTopics";
import FeaturedGrid from "@/components/FeaturedGrid";
import MostReadList from "@/components/MostReadList";
import LiveUpdatesWidget from "@/components/LiveUpdatesWidget";
import HoroscopeWidget from "@/components/HoroscopeWidget";
import CategoryRiver from "@/components/CategoryRiver";
import VideoNewsSection from "@/components/VideoNewsSection";
import PhotoGallerySection from "@/components/PhotoGallerySection";
import EditorsPicksSection from "@/components/EditorsPicksSection";
import Footer from "@/components/Footer";
import {
  getHeroFeed,
  getFeaturedArticles,
  getMostRead,
  getCategoryArticles,
  getHoroscopeReadings,
  todayLabel,
} from "@/lib/data";
import { HOME_SEO } from "@/lib/seo";

export const metadata: Metadata = {
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  keywords: HOME_SEO.keywords,
};

// Featured river row on the homepage, matching the reference layout.
const RIVER_CATEGORIES = ["tamilnadu", "india", "world", "business"];

// News content changes frequently — revalidate rather than freeze at build time.
export const revalidate = 60;

export default async function HomePage() {
  const [{ lead, side }, featured, mostRead, readings, riverArticles] = await Promise.all([
    getHeroFeed(),
    getFeaturedArticles(6),
    getMostRead(5),
    getHoroscopeReadings(),
    Promise.all(RIVER_CATEGORIES.map((key) => getCategoryArticles(key, 4))),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <BreakingTicker />
      <main className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-7 md:pt-9 pb-12 md:pb-16 flex-1">
        <h1 className="sr-only">{HOME_SEO.h1}</h1>
        <HeroSection lead={lead} side={side} />
        <TrendingTopics />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 md:gap-10 mb-9 md:mb-12">
          <FeaturedGrid articles={featured} />
          <aside className="flex flex-col gap-6">
            <MostReadList items={mostRead} />
            <LiveUpdatesWidget />
          </aside>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-9 md:mb-12 pb-9 md:pb-12 border-b border-border">
          {RIVER_CATEGORIES.map((key, i) => (
            <CategoryRiver key={key} category={key} articles={riverArticles[i]} />
          ))}
        </section>

        <HoroscopeWidget readings={readings} today={todayLabel()} />
        <VideoNewsSection />
        <PhotoGallerySection />
        <EditorsPicksSection />
        {/* NewsletterSignup temporarily hidden — component and /api/newsletter
        route are still intact, just not rendered on the homepage. */}
      </main>
      <Footer />
    </div>
  );
}

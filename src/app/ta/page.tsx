import type { Metadata } from "next";
import Header from "@/components/Header";
import BreakingTicker from "@/components/BreakingTicker";
import HeroSection from "@/components/HeroSection";
import HoroscopeWidget from "@/components/HoroscopeWidget";
import CategoryRiver from "@/components/CategoryRiver";
import Footer from "@/components/Footer";
import { CATEGORIES } from "@/lib/categories";
import { getHeroFeed, getCategoryArticles, getHoroscopeReadings, todayLabel } from "@/lib/data";

export const metadata: Metadata = {
  title: "PulseNews — முகப்பு",
};

// News content changes frequently — revalidate rather than freeze at build time.
export const revalidate = 60;

export default async function HomePage() {
  const [{ lead, side }, readings, categoryRivers] = await Promise.all([
    getHeroFeed(),
    getHoroscopeReadings(),
    Promise.all(CATEGORIES.map((cat) => getCategoryArticles(cat.key, 4))),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <BreakingTicker />
      <main className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-7 md:pt-9 pb-12 md:pb-16 flex-1">
        <HeroSection lead={lead} side={side} />
        <HoroscopeWidget readings={readings} today={todayLabel()} />
        {CATEGORIES.map((cat, i) => (
          <CategoryRiver key={cat.key} category={cat.key} articles={categoryRivers[i]} />
        ))}
      </main>
      <Footer />
    </div>
  );
}

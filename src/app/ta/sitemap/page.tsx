import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "தள வரைபடம் — PulseNews",
};

const SECTIONS = [
  {
    heading: "பிரிவுகள்",
    links: CATEGORIES.map((c) => ({ label: c.label, href: `/ta/${c.key}` })),
  },
  {
    heading: "உதவி",
    links: [
      { label: "அடிக்கடி கேட்கப்படும் கேள்விகள்", href: "/ta/faq" },
      { label: "தனியுரிமைக் கொள்கை", href: "/ta/privacy" },
      { label: "பயன்பாட்டு விதிமுறைகள்", href: "/ta/terms" },
    ],
  },
  {
    heading: "பிற",
    links: [
      { label: "தேடல்", href: "/ta/search" },
      { label: "RSS ஊட்டம்", href: "/rss.xml" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[820px] w-full mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[26px] md:text-[32px] font-bold m-0 mb-6">தள வரைபடம்</h1>

        <div className="flex flex-col gap-6">
          <div className="pb-6 border-b border-border">
            <h2 className="text-[17px] md:text-[18px] font-bold text-text m-0 mb-2">முகப்பு</h2>
            <Link href="/ta" className="text-[15px] text-accent font-semibold">
              PulseNews முகப்புப் பக்கம்
            </Link>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.heading} className="pb-6 border-b border-border last:border-0">
              <h2 className="text-[17px] md:text-[18px] font-bold text-text m-0 mb-3">{section.heading}</h2>
              <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[15px] text-accent font-semibold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

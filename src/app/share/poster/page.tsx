import type { Metadata } from "next";
import Link from "next/link";

// Dedicated crawlable target for the poster-generator's social share icons
// (src/app/admin/poster). Facebook's sharer and X's intent dialog only show
// a rich image preview for a real scrapeable URL with proper og:image /
// twitter:image tags — they can't attach a device file directly, so this
// page exists purely to give them something to scrape.
type SearchParams = Promise<{ img?: string; title?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { img, title } = await searchParams;
  const pageTitle = title ? `${title} — PulseNews` : "PulseNews";
  return {
    title: pageTitle,
    description: "PulseNews — தமிழ் செய்திகள்",
    openGraph: {
      title: pageTitle,
      description: "PulseNews — தமிழ் செய்திகள்",
      images: img ? [{ url: img, width: 1024, height: 1024 }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: "PulseNews — தமிழ் செய்திகள்",
      images: img ? [img] : undefined,
    },
  };
}

export default async function SharePosterPage({ searchParams }: { searchParams: SearchParams }) {
  const { img, title } = await searchParams;

  return (
    <div className="max-w-[480px] w-full mx-auto px-4 py-14 flex flex-col items-center text-center gap-4">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element -- externally hosted Supabase Storage URL, not a static asset
        <img src={img} alt={title || "PulseNews"} className="w-full rounded-lg border border-border" />
      )}
      {title && <p className="text-[16px] font-semibold m-0">{title}</p>}
      <Link
        href="/ta"
        className="rounded-lg px-4 py-2.5 font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        PulseNews-ல் மேலும் செய்திகள்
      </Link>
    </div>
  );
}

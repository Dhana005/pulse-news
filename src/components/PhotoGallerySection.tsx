import Link from "next/link";
import ArticleMedia from "./ArticleMedia";
import { getCategoryLabel } from "@/lib/categories";
import { getPhotoGalleries } from "@/lib/data";

export default async function PhotoGallerySection() {
  const galleries = await getPhotoGalleries();
  if (galleries.length === 0) return null;

  return (
    <section id="photo-gallery" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">புகைப்பட தொகுப்பு</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {galleries.map((g) => (
          <Link key={g.category} href={`/ta/${g.category}`} className="flex flex-col gap-2">
            <div className="relative">
              <ArticleMedia imageUrl={g.coverImageUrl} alt={getCategoryLabel(g.category)} className="h-[110px] md:h-[130px] w-full" />
              <span
                className="absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-1 rounded"
                style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
              >
                {g.count} புகைப்படங்கள்
              </span>
            </div>
            <span className="text-[13.5px] font-semibold leading-[1.4]">{getCategoryLabel(g.category)} புகைப்படங்கள்</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

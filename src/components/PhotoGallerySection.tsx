import PlaceholderMedia from "./PlaceholderMedia";

// Sample placeholder content — no photo-gallery content source exists yet.
// Swap SAMPLE_GALLERIES for real data once one does.
const SAMPLE_GALLERIES = [
  { title: "சித்திரை திருவிழா 2024", count: 25 },
  { title: "IPL 2024 Highlights", count: 18 },
  { title: "இயற்கையின் அழகு", count: 30 },
  { title: "தமிழக திருவிழாக்கள்", count: 22 },
];

export default function PhotoGallerySection() {
  return (
    <section id="photo-gallery" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">புகைப்பட தொகுப்பு</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {SAMPLE_GALLERIES.map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            <div className="relative">
              <PlaceholderMedia className="h-[110px] md:h-[130px] w-full" />
              <span
                className="absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-1 rounded"
                style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
              >
                {g.count} புகைப்படங்கள்
              </span>
            </div>
            <span className="text-[13.5px] font-semibold leading-[1.4]">{g.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

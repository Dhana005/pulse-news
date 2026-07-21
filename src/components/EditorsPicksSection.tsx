import Link from "next/link";
import { getEditorsPicks } from "@/lib/data";

// "ஆசிரியர் குழு" (Editorial Board) is an institutional byline, not a named
// person — there's no real photo to show, so a pen/opinion icon badge is
// more honest than either a fake headshot or an empty placeholder (matches
// the FACT CHECK badge's existing icon-not-photo treatment below).
function OpinionBadge() {
  return (
    <span
      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
      style={{ background: "var(--accent-soft)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </span>
  );
}

export default async function EditorsPicksSection() {
  const { opinions, factCheck } = await getEditorsPicks();
  if (opinions.length === 0 && !factCheck) return null;

  return (
    <section id="editors-picks" className="mb-9 md:mb-12 scroll-mt-32">
      <div className="flex items-baseline justify-between mb-5 pb-2.5 border-b-2 border-border">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">எடிட்டரின் தேர்வு</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {opinions.map((pick) => (
          <Link key={pick.slug} href={`/ta/${pick.category}/${pick.slug}`} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <OpinionBadge />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11.5px] font-bold text-accent">கருத்துக் கட்டுரை</span>
                <span className="text-[13px] font-semibold truncate">{pick.author}</span>
              </div>
            </div>
            <span className="text-[14.5px] font-semibold leading-[1.4]">{pick.headline}</span>
          </Link>
        ))}
        {factCheck && (
          <Link href={`/ta/${factCheck.category}/${factCheck.slug}`} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] text-center leading-tight"
                style={{ background: "#d32f2f", color: "#fff" }}
              >
                FACT<br />CHECK
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11.5px] font-bold" style={{ color: "#d32f2f" }}>
                  Fact Check
                </span>
                <span className="text-[13px] font-semibold truncate">{factCheck.author}</span>
              </div>
            </div>
            <span className="text-[14.5px] font-semibold leading-[1.4]">{factCheck.headline}</span>
          </Link>
        )}
      </div>
    </section>
  );
}

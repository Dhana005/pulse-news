import { getTickerItems } from "@/lib/data";

export default async function BreakingTicker() {
  const items = await getTickerItems();
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
      <div className="flex items-center gap-4 px-4 md:px-10 py-2">
        <span
          className="shrink-0 font-bold text-[12px] md:text-[13px] px-2.5 py-1 rounded"
          style={{ background: "var(--accent-text)", color: "var(--accent)" }}
        >
          முக்கியச் செய்தி
        </span>
        <div className="overflow-hidden flex-1 whitespace-nowrap">
          <div className="inline-flex gap-12 animate-ticker text-[13.5px] md:text-[14.5px] font-medium">
            {loop.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

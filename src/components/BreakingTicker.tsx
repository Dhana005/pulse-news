import { getTickerItems } from "@/lib/data";

export default async function BreakingTicker() {
  const items = await getTickerItems();
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-border bg-bg">
      <div className="flex items-center gap-3 px-4 md:px-10 py-2">
        <span
          className="shrink-0 font-bold text-[11px] md:text-[12px] px-2.5 py-1 rounded"
          style={{ background: "#d32f2f", color: "#fff" }}
        >
          BREAKING
        </span>
        <span
          className="hidden sm:flex items-center gap-1.5 shrink-0 font-bold text-[11px] px-2.5 py-1 rounded"
          style={{ background: "#d32f2f", color: "#fff" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
          LIVE
        </span>
        <div className="overflow-hidden flex-1 whitespace-nowrap">
          <div className="inline-flex items-center gap-4 animate-ticker text-[13.5px] md:text-[14.5px] font-medium">
            {loop.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4">
                {i > 0 && <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#d32f2f" }} aria-hidden="true" />}
                {item}
              </span>
            ))}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          className="hidden sm:block shrink-0"
          aria-hidden="true"
        >
          <polyline points="9,6 15,12 9,18" />
        </svg>
      </div>
    </div>
  );
}

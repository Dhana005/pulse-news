"use client";

import { useState } from "react";
import type { HoroscopeReading } from "@/lib/data";

export default function HoroscopeWidget({
  readings,
  today,
}: {
  readings: HoroscopeReading[];
  today: string;
}) {
  const [rashiIdx, setRashiIdx] = useState(0);
  const selected = readings[rashiIdx];

  return (
    <section className="bg-surface border border-border rounded-[10px] p-5 md:p-7 mb-10 md:mb-14">
      <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
        <h2 className="text-[20px] md:text-[22px] font-bold m-0">இன்றைய ராசி பலன்</h2>
        <span className="text-[13px] text-text-faint">{today}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mb-5">
        {readings.map((r, i) => {
          const active = i === rashiIdx;
          return (
            <button
              key={r.rashiKey}
              onClick={() => setRashiIdx(i)}
              className="py-2.5 px-1 rounded-lg text-[13.5px] font-semibold cursor-pointer border transition-colors"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent-soft)" : "transparent",
                color: "var(--text)",
              }}
            >
              {r.rashiName}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-[15px] leading-[1.7] text-text-muted m-0 max-w-[70ch]">
          {selected.rashiName}: {selected.text}
        </p>
      )}
    </section>
  );
}

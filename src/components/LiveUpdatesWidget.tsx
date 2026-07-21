import { getLiveMatch } from "@/lib/cricket";
import { getChennaiWeather, weatherIcon } from "@/lib/weather";
import { getTickerItems } from "@/lib/data";

export default async function LiveUpdatesWidget() {
  const [match, weather, ticker] = await Promise.all([getLiveMatch(), getChennaiWeather(), getTickerItems()]);
  const latestHeadline = ticker[0];

  const rows = [
    match && { label: match.name, detail: match.status },
    latestHeadline && { label: latestHeadline, detail: "தமிழகம் நேரலை" },
    weather && { label: `சென்னை வானிலை அப்டேட்`, detail: `${weatherIcon(weather.condition)} ${weather.tempC}°C` },
  ].filter((r): r is { label: string; detail: string } => Boolean(r));

  if (rows.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5">
      <div className="flex items-center gap-2 mb-3.5">
        <span
          className="flex items-center gap-1.5 shrink-0 font-bold text-[11px] px-2 py-0.5 rounded"
          style={{ background: "#d32f2f", color: "#fff" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
          LIVE
        </span>
        <h3 className="text-[15px] font-bold m-0">அப்டேட்ஸ்</h3>
      </div>
      <div className="flex flex-col gap-3.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#d32f2f" }} aria-hidden="true" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13.5px] font-semibold leading-[1.4]">{row.label}</span>
              <span className="text-[12px] text-text-faint">{row.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

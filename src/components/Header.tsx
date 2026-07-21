import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import MobileNav from "./MobileNav";
import SearchBar from "./SearchBar";
import MoreMenu from "./MoreMenu";
import { NAV_ITEMS } from "@/lib/categories";
import { getChennaiWeather, weatherIcon } from "@/lib/weather";

export default async function Header({
  activeKey = "",
}: {
  activeKey?: string;
}) {
  const weather = await getChennaiWeather();

  return (
    <header className="sticky top-0 z-20">
      <div className="flex items-center justify-between gap-3 md:gap-6 px-4 md:px-10 py-2.5 md:py-3 border-b border-border bg-bg">
        <Logo />

        <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
          {weather && (
            <span className="flex items-center gap-1.5 text-[13.5px] text-text-muted whitespace-nowrap">
              <span aria-hidden="true">{weatherIcon(weather.condition)}</span>
              சென்னை {weather.tempC}°
            </span>
          )}
          <span
            className="flex items-center gap-1.5 shrink-0 font-bold text-[11.5px] px-2.5 py-1 rounded"
            style={{ background: "#d32f2f", color: "#fff" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
              aria-hidden="true"
            />
            LIVE
          </span>
          <div className="flex items-center gap-2 border border-border rounded-full px-3.5 py-1.5 w-[220px] shrink-0">
            <SearchBar />
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-3">
          <ThemeToggle />
          <Link
            href="/ta"
            aria-label="கணக்கு"
            className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center shrink-0"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              display: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </Link>
          <MobileNav activeKey={activeKey} />
        </div>
      </div>

      <nav
        className="hidden md:flex items-center gap-6 px-4 md:px-10 py-2.5 text-[14.5px] font-semibold overflow-x-auto"
        style={{ background: "var(--accent)" }}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.key ? `/ta/${item.key}` : "/ta"}
            className="whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{
              color: "var(--accent-text)",
              opacity: item.key === activeKey ? 1 : 0.82,
              textDecoration: item.key === activeKey ? "underline" : "none",
              textUnderlineOffset: "6px",
            }}
          >
            {item.label}
          </Link>
        ))}
        <MoreMenu color="var(--accent-text)" />
      </nav>
    </header>
  );
}

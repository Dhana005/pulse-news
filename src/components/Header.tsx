import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import MobileNav from "./MobileNav";
import { NAV_ITEMS } from "@/lib/categories";

export default function Header({ activeKey = "" }: { activeKey?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 md:gap-6 px-4 md:px-10 py-3.5 md:py-[18px] border-b border-border bg-bg">
      <Logo />

      <nav className="hidden md:flex gap-7 text-[16px] font-semibold flex-1 justify-center">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.key ? `/ta/${item.key}` : "/ta"}
            className="hover:text-accent transition-colors"
            style={{ color: item.key === activeKey ? "var(--accent)" : "var(--text-muted)" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 md:gap-3.5">
        <button
          aria-label="தேடல்"
          className="hidden sm:flex w-9 h-9 rounded-full border border-border items-center justify-center shrink-0 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <ThemeToggle />
        <MobileNav activeKey={activeKey} />
      </div>
    </header>
  );
}

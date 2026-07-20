"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/categories";

export default function MobileNav({ activeKey = "" }: { activeKey?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="மெனுவைத் திற"
        className="md:hidden w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0 cursor-pointer"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-bg border-l border-border p-6 flex flex-col gap-1">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setOpen(false)}
                aria-label="மெனுவை மூடு"
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="20" y2="20" />
                  <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
              </button>
            </div>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.key ? `/ta/${item.key}` : "/ta"}
                onClick={() => setOpen(false)}
                className="text-[17px] font-semibold py-3 border-b border-border"
                style={{ color: item.key === activeKey ? "var(--accent)" : "var(--text)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

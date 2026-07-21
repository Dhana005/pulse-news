"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MORE_LINKS = [
  { label: "ராசி பலன்", href: "/ta#horoscope" },
  { label: "வீடியோ செய்திகள்", href: "/ta#video-news" },
  { label: "புகைப்பட தொகுப்பு", href: "/ta#photo-gallery" },
  { label: "எடிட்டரின் தேர்வு", href: "/ta#editors-picks" },
];

export default function MoreMenu({ color }: { color: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
        style={{ color }}
      >
        மேலும்
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-2 min-w-[180px] rounded-lg border border-border bg-surface shadow-lg py-1.5 z-30"
          style={{ color: "var(--text)" }}
        >
          {MORE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[14px] font-semibold hover:bg-bg"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

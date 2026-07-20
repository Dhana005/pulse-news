"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("pn-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="தீம் மாற்று"
      className="w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0 cursor-pointer text-[15px]"
    >
      {dark === null ? null : dark ? "☀" : "☾"}
    </button>
  );
}

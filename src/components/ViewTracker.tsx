"use client";

import { useEffect } from "react";

export default function ViewTracker({ category, slug }: { category: string; slug: string }) {
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, slug }),
      keepalive: true,
    }).catch(() => {});
    // Fire once per mount only — a re-render (e.g. theme toggle) shouldn't
    // double-count the same page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

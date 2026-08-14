"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/tracking";

// Same loaded-adsbygoogle.js reuse as DisplayAd/InArticleAd. Multiplex
// ("autorelaxed") renders a multi-tile grid, so it needs a full-width
// container — unlike DisplayAd/InArticleAd, don't drop this into the
// 320px sidebar.
export default function MultiplexAd({ slot }: { slot: string }) {
  useEffect(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-format="autorelaxed"
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
    />
  );
}

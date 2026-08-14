"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/tracking";

// Same loaded-adsbygoogle.js reuse as DisplayAd — see that component's
// comment. Separate component (rather than a prop on DisplayAd) because
// in-article slots use a different ad-unit type (data-ad-layout="in-article"
// / data-ad-format="fluid" vs. plain "auto"), which AdSense ties to a
// distinct ad-slot ID that can't be reused for a display placement.
export default function InArticleAd({ slot }: { slot: string }) {
  useEffect(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", textAlign: "center" }}
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
    />
  );
}

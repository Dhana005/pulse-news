"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/tracking";

// adsbygoogle.js itself is already loaded site-wide (unconditionally, per
// Google Consent Mode) via injectAdScripts in src/lib/tracking.ts — this
// just renders the <ins> slot and queues it for that script to fill.
export default function DisplayAd({ slot }: { slot: string }) {
  useEffect(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

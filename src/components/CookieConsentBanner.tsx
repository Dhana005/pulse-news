"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredConsent, setStoredConsent } from "@/lib/consent";
import { injectTrackingScripts } from "@/lib/tracking";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === "granted") {
      injectTrackingScripts();
    } else if (stored === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    setStoredConsent("granted");
    injectTrackingScripts();
    setVisible(false);
  }

  function reject() {
    setStoredConsent("denied");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="குக்கீ சம்மதம்"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface"
    >
      <div className="max-w-[1240px] w-full mx-auto px-4 md:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
        <p className="text-[13.5px] leading-[1.6] text-text-muted m-0 flex-1">
          உங்கள் அனுபவத்தை மேம்படுத்தவும், பொருத்தமான விளம்பரங்களைக் காட்டவும் இந்த வலைத்தளம் குக்கீகளைப் பயன்படுத்துகிறது.{" "}
          <Link href="/ta/privacy" className="text-accent font-semibold">
            தனியுரிமைக் கொள்கை
          </Link>
        </p>
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 rounded-lg font-semibold text-[13.5px] border border-border cursor-pointer"
          >
            நிராகரி
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg font-semibold text-[13.5px] cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            ஏற்றுக்கொள்
          </button>
        </div>
      </div>
    </div>
  );
}

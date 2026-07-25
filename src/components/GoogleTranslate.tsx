"use client";

import { useEffect } from "react";
import { getStoredConsent, onConsentChange } from "@/lib/consent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleTranslateNamespace = any;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: GoogleTranslateNamespace };
  }
}

const SCRIPT_ID = "google-translate-script";

function loadWidget() {
  if (window.google?.translate || document.getElementById(SCRIPT_ID)) return;

  window.googleTranslateElementInit = () => {
    new window.google!.translate!.TranslateElement(
      {
        pageLanguage: "ta",
        includedLanguages: "en",
        layout: window.google!.translate!.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element",
    );
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

export default function GoogleTranslate() {
  // Sets its own cookies, so — same as GTM/GA/Clarity/AdSense — this only
  // loads after cookie consent is granted, not unconditionally on mount.
  useEffect(() => {
    if (getStoredConsent() === "granted") loadWidget();
    return onConsentChange((choice) => {
      if (choice === "granted") loadWidget();
    });
  }, []);

  return <div id="google_translate_element" className="google-translate-widget" />;
}

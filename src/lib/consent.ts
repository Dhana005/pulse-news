// Cookie-consent choice, persisted client-side. Written by
// CookieConsentBanner; read by it and by any other component that gates a
// cookie-setting script behind consent (src/lib/tracking.ts's GTM/GA/
// Clarity/AdSense bundle, GoogleTranslate's widget script). Components that
// need to react to a same-tab Accept click (not just check on mount) should
// use onConsentChange — localStorage's own "storage" event only fires in
// *other* tabs, never the one that made the change.

const STORAGE_KEY = "pn-cookie-consent";
const CONSENT_EVENT = "pn-consent-change";

export type ConsentChoice = "granted" | "denied";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setStoredConsent(choice: ConsentChoice): void {
  window.localStorage.setItem(STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}

export function onConsentChange(callback: (choice: ConsentChoice) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

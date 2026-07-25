// Cookie-consent choice, persisted client-side. Read/written only by
// CookieConsentBanner and TrackingScripts — see src/lib/tracking.ts for what
// actually gets gated behind it.

const STORAGE_KEY = "pn-cookie-consent";

export type ConsentChoice = "granted" | "denied";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setStoredConsent(choice: ConsentChoice): void {
  window.localStorage.setItem(STORAGE_KEY, choice);
}

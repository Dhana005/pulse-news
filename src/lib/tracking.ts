// GTM/GA/Clarity/AdSense — moved out of layout.tsx to keep layout.tsx a
// server component. GTM/GA/AdSense (injectAdScripts) load unconditionally on
// every page and are governed by Google Consent Mode signals instead (see
// CONSENT_INIT_SCRIPT in layout.tsx and updateAdConsent below) — AdSense's
// review crawler never clicks the cookie-consent banner, so gating the
// script itself behind consent meant the crawler could never see it
// execute. Clarity doesn't understand Consent Mode, so it stays gated
// behind actual accept (see CookieConsentBanner), same as GoogleTranslate.

// None of these IDs are secret — all public in the page's HTML by design
// once loaded, same reasoning as when they lived in layout.tsx.
export const ADSENSE_CLIENT_ID = "ca-pub-5364676429059788";
const GA_MEASUREMENT_ID = "G-WVBZT5S2S3";
const GTM_ID = "GTM-MKXKS66S";
const CLARITY_PROJECT_ID = "xq8rs4hdlj";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
  }
}

const GTM_INIT_SCRIPT = `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`;

const GA_INIT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`;

const CLARITY_INIT_SCRIPT = `
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
`;

let adScriptsInjected = false;
let clarityInjected = false;

function inlineScript(html: string): void {
  const script = document.createElement("script");
  script.innerHTML = html;
  document.head.appendChild(script);
}

function externalScript(src: string): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function injectAdScripts(): void {
  if (adScriptsInjected) return;
  adScriptsInjected = true;

  inlineScript(GTM_INIT_SCRIPT);
  // AdSense's own self-check flags a console warning on scripts carrying
  // Next.js's <Script> data-nscript attribute — plain DOM injection avoids
  // that, same reasoning as when this lived as a hand-written <script> tag
  // in layout.tsx.
  const adsense = document.createElement("script");
  adsense.async = true;
  adsense.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  adsense.crossOrigin = "anonymous";
  document.head.appendChild(adsense);

  externalScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
  inlineScript(GA_INIT_SCRIPT);
}

export function injectClarity(): void {
  if (clarityInjected) return;
  clarityInjected = true;
  inlineScript(CLARITY_INIT_SCRIPT);
}

// Tells GTM/gtag/AdSense whether they may actually set cookies / personalize
// — the scripts themselves are already loaded (injectAdScripts runs
// unconditionally), Consent Mode is what gates their behavior.
export function updateAdConsent(choice: "granted" | "denied"): void {
  window.gtag?.("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

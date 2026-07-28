import type { Metadata } from "next";
import { Hind_Madurai, Poppins } from "next/font/google";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import "./globals.css";

// Google AdSense's site-ownership meta tag — not a tracking script itself
// (sets no cookies, runs no JS), so it's fine to keep unconditional. The
// actual adsbygoogle.js script only loads after cookie consent — see
// src/lib/tracking.ts. Publisher ID is not secret (it's public in every
// page's HTML by design), so it's fine to hardcode rather than env-var it.
const ADSENSE_CLIENT_ID = "ca-pub-5364676429059788";

const hindMadurai = Hind_Madurai({
  variable: "--font-hind-madurai",
  subsets: ["tamil", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pulsenewscast.com"),
  title: "PulseNews — தமிழ் செய்திகள்",
  description: "தமிழகம், இந்தியா, உலகம், விளையாட்டு, சினிமா செய்திகள் ஒரே இடத்தில்.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('pn-theme');
    document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
  } catch (e) {}
})();
`;

// NewsMediaOrganization structured data — the schema.org type Google
// specifically recommends for news publishers (a subtype of Organization).
// WEBSITE_SCHEMA's `publisher` below used to reference an @id that was
// never actually defined anywhere — this fixes that dangling reference and
// gives Google (and anything reading structured data, e.g. AI Overviews) a
// real, named entity to attach to the site rather than just a bare URL.
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": "https://www.pulsenewscast.com/#organization",
  name: "PulseNews",
  alternateName: "Pulse News Cast",
  url: "https://www.pulsenewscast.com/",
  logo: {
    "@type": "ImageObject",
    url: "https://www.pulsenewscast.com/apple-icon.png",
    width: 180,
    height: 180,
  },
  description: "Latest breaking news, politics, business, technology, sports, entertainment and world news.",
};

// WebSite structured data (schema.org) for search engines.
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.pulsenewscast.com/#website",
  url: "https://www.pulsenewscast.com/",
  name: "Pulse News Cast",
  alternateName: "PulseNewsCast",
  description: "Latest breaking news, politics, business, technology, sports, entertainment and world news.",
  publisher: {
    "@id": "https://www.pulsenewscast.com/#organization",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" className={`${hindMadurai.variable} ${poppins.variable} h-full antialiased`}>
      <head>
        {/* Plain static <link> tags, not Next's app/icon.png file convention —
        that convention appends a build-specific content-hash query string
        that changes on every deploy, which violates Google Search's favicon
        requirement that the URL stay stable. These live in /public instead,
        served verbatim with no hashing, so the URL never changes. */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" type="image/x-icon" />
        <link rel="icon" href="/icon.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" type="image/png" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}

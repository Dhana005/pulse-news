import type { Metadata } from "next";
import { Hind_Madurai, Poppins } from "next/font/google";
import "./globals.css";

// Google AdSense Auto ads — one script, Google decides ad placement across
// the whole site. Publisher ID is not secret (it's public in every page's
// HTML by design), so it's fine to hardcode rather than env-var it.
const ADSENSE_CLIENT_ID = "ca-pub-5364676429059788";

// Google Analytics (gtag.js). Measurement ID is not secret (public in every
// page's HTML by design), same reasoning as ADSENSE_CLIENT_ID above.
const GA_MEASUREMENT_ID = "G-WVBZT5S2S3";

const GA_INIT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`;

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" className={`${hindMadurai.variable} ${poppins.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
        {/* Plain <script>, not next/script's <Script> — Next's component
            stamps a data-nscript attribute onto the tag for its own dedup
            tracking, which AdSense's self-check flags with a console warning. */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: GA_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}

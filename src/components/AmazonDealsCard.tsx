import { TECH_SEARCH_LINKS, buildAmazonSearchUrl } from "@/lib/affiliate";

// Amazon's operating agreement requires a visible disclosure near affiliate
// links, and Google recommends rel="sponsored" on paid/affiliate outbound
// links (separate from rel="nofollow", which alone doesn't cover paid
// links per Google's link-scheme guidance) — both handled here so every
// call site gets them automatically.
export default function AmazonDealsCard() {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-5">
      <h3 className="text-[15px] font-bold mb-3.5 m-0">தொழில்நுட்ப பொருட்கள்</h3>
      <div className="flex flex-col gap-2 mb-3.5">
        {TECH_SEARCH_LINKS.map((link) => (
          <a
            key={link.query}
            href={buildAmazonSearchUrl(link.query)}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="text-[14px] font-semibold text-accent"
          >
            {link.label} →
          </a>
        ))}
      </div>
      <p className="text-[11.5px] leading-[1.6] text-text-faint m-0">
        Amazon Associate திட்டத்தில் பங்கேற்பாளராக, தகுதியான கொள்முதல்களில் இருந்து PulseNews வருவாய்
        ஈட்டுகிறது. (As an Amazon Associate, PulseNews earns from qualifying purchases.)
      </p>
    </div>
  );
}

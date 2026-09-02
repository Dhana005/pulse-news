"use client";

import { useState } from "react";

const CONTACT_EMAIL = "pulsenewscast@gmail.com";

// The three icons in the article byline row (✉ email, ↗ share, ⚑ report)
// were plain <button>s with no onClick at all — purely decorative, did
// nothing when clicked. Split into its own client component since the
// article page itself is a Server Component and these need
// navigator.share/clipboard access.
export default function ArticleShareIcons({ url, headline }: { url: string; headline: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: headline, url });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can do without a
      // fallback UI; the button just won't confirm anything happened.
    }
  }

  const mailBody = encodeURIComponent(`${headline}\n\n${url}`);
  const reportBody = encodeURIComponent(`Reporting an issue with this article:\n${url}\n\nWhat's wrong: `);

  return (
    <div className="hidden sm:flex gap-2.5 relative">
      <a
        href={`mailto:?subject=${encodeURIComponent(headline)}&body=${mailBody}`}
        aria-label="மின்னஞ்சல் மூலம் பகிர்"
        title="மின்னஞ்சல் மூலம் பகிர்"
        className="w-[34px] h-[34px] rounded-full border border-border flex items-center justify-center text-text-muted cursor-pointer no-underline"
      >
        ✉
      </a>
      <button
        type="button"
        onClick={handleShare}
        aria-label="பகிர்"
        title="பகிர்"
        className="w-[34px] h-[34px] rounded-full border border-border flex items-center justify-center text-text-muted cursor-pointer"
      >
        ↗
      </button>
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`கருத்து: ${headline}`)}&body=${reportBody}`}
        aria-label="புகார் அளிக்க"
        title="புகார் அளிக்க"
        className="w-[34px] h-[34px] rounded-full border border-border flex items-center justify-center text-text-muted cursor-pointer no-underline"
      >
        ⚑
      </a>
      {copied && (
        <span className="absolute top-[calc(100%+6px)] right-0 text-[12px] px-2.5 py-1 rounded-md bg-surface border border-border text-text-muted whitespace-nowrap">
          இணைப்பு நகலெடுக்கப்பட்டது
        </span>
      )}
    </div>
  );
}

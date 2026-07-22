"use client";

import { useState } from "react";

const BANNER_PRESETS = [
  "BREAKING NEWS",
  "TRENDING",
  "HOT NEWS",
  "EXCLUSIVE",
  "LIVE UPDATE",
  "DEVELOPING STORY",
  "TODAY'S TOP STORY",
  "FACT CHECK",
  "EXPLAINED",
  "FUN FACTS",
  "GOOD NEWS",
  "VIRAL",
  "QUICK UPDATE",
];

// Keep in sync with POSTER_PLANS in src/app/api/generate-poster/route.ts.
const PLANS = [
  { value: "free", label: "Free — $0, code-only background" },
  { value: "lower", label: "Lower — ~$0.004-0.006, AI (low quality, no logo ref)" },
  { value: "low", label: "Low — ~$0.006-0.009, AI (low quality, logo+photo ref)" },
  { value: "medium", label: "Medium — ~$0.015, AI (medium quality, logo+photo ref)" },
] as const;

const CATEGORIES = [
  "Tamil Nadu",
  "India",
  "World",
  "Business",
  "Technology",
  "Sports",
  "Cinema",
  "Entertainment",
  "Lifestyle",
  "Politics",
  "Crime",
  "Health",
  "Education",
];

export default function PosterGeneratorPage() {
  const [password, setPassword] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [banner, setBanner] = useState(BANNER_PRESETS[0]);
  const [plan, setPlan] = useState<(typeof PLANS)[number]["value"]>("free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const headlineRequired = plan !== "free";

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !password || (headlineRequired && !headline.trim())) return;

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("image", imageFile);
      formData.append("headline", headline);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("banner", banner);
      formData.append("plan", plan);

      const res = await fetch("/api/generate-poster", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      setResultUrl(json.image);

      // Build a real File for the Web Share API (lets WhatsApp/Instagram/X/etc.
      // receive the actual image, not just a caption) — only offer the button
      // when the browser actually supports sharing files.
      const blob = await (await fetch(json.image)).blob();
      const file = new File([blob], "pulsenews-poster.png", { type: "image/png" });
      setResultFile(file);
      setCanShareFile(Boolean(navigator.canShare?.({ files: [file] })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  // The user wants the actual poster image attached to the post, not a
  // link-preview card — the Web Share API is the only browser mechanism
  // that can hand a real file to another app, so every icon tries that
  // first (this is what makes Instagram/Facebook/X show up as share targets
  // with the image already attached, on mobile or a supporting desktop
  // browser). No web site can attach a file directly into these platforms'
  // own composers — that's a platform restriction, not something a browser
  // API can work around — so when file-sharing isn't available we download
  // the poster instead and point the user at the platform to attach it
  // manually.
  function downloadPoster() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultFile!);
    a.download = "pulsenews-poster.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function handleIconShare(platform: "instagram" | "facebook" | "x") {
    setShareNote(null);

    if (canShareFile && resultFile) {
      try {
        await navigator.share({ files: [resultFile], title: "PulseNews", text: headline });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
      return;
    }

    downloadPoster();
    if (platform === "instagram") {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setShareNote("Instagram doesn't accept images from a website at all — the poster has been downloaded, open Instagram and upload it from there.");
    } else if (platform === "facebook") {
      window.open("https://www.facebook.com/", "_blank", "noopener,noreferrer");
      setShareNote("Facebook's website can't accept an attached file from another site — the poster has been downloaded, click \"Create post\" on Facebook and attach it there.");
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(headline || "PulseNews")}`, "_blank", "noopener,noreferrer");
      setShareNote("X's website can't accept an attached file from another site — the poster has been downloaded, attach it to the tweet that just opened.");
    }
  }

  const SHARE_ICONS = [
    {
      key: "instagram" as const,
      label: "Instagram",
      path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5-1.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
    },
    {
      key: "facebook" as const,
      label: "Facebook",
      path: "M14 9h3V6h-3c-1.66 0-3 1.34-3 3v2H9v3h2v6h3v-6h3l1-3h-4v-2c0-.55.45-1 1-1z",
    },
    { key: "x" as const, label: "X", path: "M4 4l16 16M20 4L4 20" },
  ];

  return (
    <div className="max-w-[640px] w-full mx-auto px-4 py-10">
      <h1 className="text-[24px] font-bold mb-6">PulseNews Poster Generator</h1>

      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Admin password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-border rounded-lg px-3 py-2 bg-surface"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">News image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            required
            className="text-[14px]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">
            Headline{!headlineRequired && " (optional on the Free plan)"}
          </span>
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required={headlineRequired}
            rows={2}
            className="border border-border rounded-lg px-3 py-2 bg-surface"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border border-border rounded-lg px-3 py-2 bg-surface"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Quality / cost</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as (typeof PLANS)[number]["value"])}
            className="border border-border rounded-lg px-3 py-2 bg-surface"
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-4">
          <label className="flex flex-col gap-1.5 flex-1">
            <span className="text-[13px] font-semibold">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-surface"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 flex-1">
            <span className="text-[13px] font-semibold">Title banner</span>
            <select
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-surface"
            >
              {BANNER_PRESETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !imageFile || !password || (headlineRequired && !headline.trim())}
          className="mt-2 rounded-lg px-4 py-2.5 font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {loading ? "Generating… (can take ~30s)" : "Generate poster"}
        </button>
      </form>

      {error && <p className="mt-4 text-[14px] text-red-600">{error}</p>}

      {resultUrl && (
        <div className="mt-8 flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated base64 data URL, not a static asset */}
          <img src={resultUrl} alt="Generated poster" className="w-full rounded-lg border border-border" />

          <a
            href={resultUrl}
            download="pulsenews-poster.png"
            className="text-center rounded-lg px-4 py-2.5 font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            Download
          </a>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold">Share:</span>
            {SHARE_ICONS.map((icon) => (
              <button
                key={icon.key}
                type="button"
                onClick={() => handleIconShare(icon.key)}
                aria-label={icon.label}
                title={icon.label}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0 hover:opacity-75"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d={icon.path} />
                </svg>
              </button>
            ))}
          </div>

          <p className="text-[12.5px] text-text-faint m-0">
            {canShareFile
              ? "Opens your device's native share sheet with the image attached — pick the app you want from there."
              : "Your browser can't attach the image directly on desktop — it'll be downloaded instead so you can attach it manually. See the note below after clicking an icon."}
          </p>
          {shareNote && <p className="text-[12.5px] text-accent m-0">{shareNote}</p>}
        </div>
      )}
    </div>
  );
}

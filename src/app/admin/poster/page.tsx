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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !headline.trim() || !password) return;

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

      const res = await fetch("/api/generate-poster", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      setResultUrl(json.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

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
          <span className="text-[13px] font-semibold">Headline</span>
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
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
          disabled={loading || !imageFile || !headline.trim() || !password}
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
        </div>
      )}
    </div>
  );
}

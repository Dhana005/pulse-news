import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryLabel } from "../categories";

// When no publisher image is available (RSS/NewsData omitted one, and the
// og:image scrape in run.ts also failed too), generate a stand-in
// illustration instead of falling through to the site's generic placeholder
// graphic. Entirely optional — every function here is a no-op without
// GEMINI_API_KEY, same fallback-quietly pattern as src/lib/weather.ts.

const IMAGE_MODEL = "gemini-3.1-flash-lite-image";
const STORAGE_BUCKET = "article-images";

function buildImagePrompt(headline: string, category: string): string {
  return (
    `Editorial news illustration for a Tamil news article. Headline (for context only — never render this or any other text in the image): "${headline}". ` +
    `Category: ${getCategoryLabel(category)}. ` +
    "Style: abstract, symbolic, flat color-block graphic design with simple icons or silhouettes representing the topic. " +
    "Absolutely no text, letters, or words anywhere in the image. " +
    "Never depict a real named person's face or likeness — use generic symbolic figures only. No logos or brand marks."
  );
}

export async function generateFallbackImage(
  headline: string,
  category: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildImagePrompt(headline, category) }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            responseFormat: { image: { aspectRatio: "16:9", imageSize: "1K" } },
          },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok) return null;

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p?.inlineData?.data);
    if (!imagePart) return null;

    return {
      data: Buffer.from(imagePart.inlineData.data, "base64"),
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    };
  } catch {
    return null;
  }
}

let bucketEnsured = false;

export async function ensureArticleImageBucket(supabase: SupabaseClient): Promise<void> {
  if (bucketEnsured) return;
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw error;
  bucketEnsured = true;
}

export async function uploadArticleImage(
  supabase: SupabaseClient,
  slug: string,
  image: { data: Buffer; mimeType: string },
): Promise<string | null> {
  const ext = image.mimeType.split("/")[1] ?? "png";
  const objectPath = `generated/${slug}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, image.data, { contentType: image.mimeType, upsert: true });
  if (error) return null;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

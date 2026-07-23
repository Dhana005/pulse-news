import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";
import { buildPosterBackgroundPrompt } from "@/lib/posterPrompt";
import { composePoster } from "@/lib/posterCompose";
import { generateTemplateBackground } from "@/lib/posterBackground";
import { ensureArticleImageBucket, uploadArticleImage } from "@/lib/ingest/images";
import { getPosterTheme, type PosterTheme } from "@/lib/posterThemes";

// Internal content-creation tool, not a public reader feature — gated by a
// shared password (env var) since three of the four plans below are billed
// OpenAI calls.
export type PosterPlan = "free" | "lower" | "low" | "medium";

interface PlanConfig {
  label: string;
  approxCostUsd: string;
  // undefined quality/withLogo means this plan doesn't call OpenAI at all.
  quality?: "low" | "medium";
  withLogo?: boolean;
}

export const POSTER_PLANS: Record<PosterPlan, PlanConfig> = {
  free: { label: "Free (code-only background, $0)", approxCostUsd: "$0" },
  lower: { label: "Lower (AI, low quality, no logo ref)", approxCostUsd: "~$0.004-0.006", quality: "low", withLogo: false },
  low: { label: "Low (AI, low quality, logo+photo ref)", approxCostUsd: "~$0.006-0.009", quality: "low", withLogo: true },
  medium: { label: "Medium (AI, medium quality, logo+photo ref)", approxCostUsd: "~$0.015", quality: "medium", withLogo: true },
};

async function generateBackground(
  plan: PosterPlan,
  uploadedBuffer: Buffer,
  apiKey: string | undefined,
  theme: PosterTheme,
  customLogoBuffer: Buffer | undefined,
): Promise<Buffer> {
  const config = POSTER_PLANS[plan];

  if (!config.quality) {
    // "free" plan — no AI call.
    return generateTemplateBackground(uploadedBuffer, theme);
  }

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured on the server.");
  }
  const client = new OpenAI({ apiKey });

  const uploadedFile = await toFile(uploadedBuffer, "photo.png", { type: "image/png" });
  const images = [uploadedFile];
  if (config.withLogo) {
    const logoBuffer = customLogoBuffer ?? (await readFile(path.join(process.cwd(), "public", "logo.png")));
    images.unshift(await toFile(logoBuffer, "logo.png", { type: "image/png" }));
  }

  const response = await client.images.edit({
    model: "gpt-image-1-mini",
    image: images,
    prompt: buildPosterBackgroundPrompt(Boolean(config.withLogo), theme),
    size: "1024x1024",
    quality: config.quality,
    output_format: "png",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data.");
  return Buffer.from(b64, "base64");
}

// Uploads the poster to the existing public article-images bucket and
// returns a link to a dedicated share-preview page carrying it as an
// og:image/twitter:image — that page (src/app/share/poster/page.tsx) is
// what Facebook's sharer and X's intent actually scrape. Returns null on any
// failure (missing env, upload error) so callers can degrade gracefully.
async function buildShareUrl(posterPng: Buffer, title: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    await ensureArticleImageBucket(supabase);
    const publicImageUrl = await uploadArticleImage(supabase, `poster-${randomUUID()}`, {
      data: posterPng,
      mimeType: "image/png",
    });
    if (!publicImageUrl) return null;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pulsenewscast.com";
    const params = new URLSearchParams({ img: publicImageUrl, title });
    return `${siteUrl}/share/poster?${params.toString()}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const adminPassword = process.env.POSTER_ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "POSTER_ADMIN_PASSWORD not configured on the server." }, { status: 500 });
  }

  const formData = await request.formData();
  const password = formData.get("password");
  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image is required." }, { status: 400 });
  }

  const planInput = String(formData.get("plan") || "lower");
  if (!(planInput in POSTER_PLANS)) {
    return NextResponse.json({ error: `Invalid plan "${planInput}".` }, { status: 400 });
  }
  const plan = planInput as PosterPlan;

  // Headline is only required on the AI plans — the AI background
  // generation doesn't use it, but the "free" template plan is the only one
  // where a poster without a headline still makes sense to produce.
  const headlineInput = formData.get("headline");
  const headline = typeof headlineInput === "string" ? headlineInput : "";
  if (plan !== "free" && !headline.trim()) {
    return NextResponse.json({ error: "headline is required for this plan." }, { status: 400 });
  }

  const banner = String(formData.get("banner") || "BREAKING NEWS");
  const description = String(formData.get("description") || "");
  const category = String(formData.get("category") || "");
  const date = String(
    formData.get("date") ||
      new Date().toLocaleDateString("ta-IN", { day: "numeric", month: "long", year: "numeric" }),
  );
  const theme = getPosterTheme(formData.get("theme") as string | null);

  const logoFile = formData.get("logo");
  const customLogoBuffer = logoFile instanceof File ? Buffer.from(await logoFile.arrayBuffer()) : undefined;

  try {
    const uploadedBuffer = Buffer.from(await image.arrayBuffer());

    const backgroundPng = await generateBackground(plan, uploadedBuffer, process.env.OPENAI_API_KEY, theme, customLogoBuffer);

    // Composite the real logo + all text deterministically on top —
    // guarantees correct spelling and an accurate brand mark, regardless
    // of which plan generated the background.
    const finalPng = await composePoster(backgroundPng, { banner, headline, description, category, date }, theme, customLogoBuffer);

    // Host the poster publicly so Facebook/X can crawl it as a real og:image
    // — their sharer/intent dialogs only render a rich image preview for a
    // scrapeable URL, never for a bare device file. Best-effort: if
    // Supabase isn't configured, shareUrl comes back null and the client
    // falls back to link-only sharing.
    const shareUrl = await buildShareUrl(finalPng, headline || banner);

    return NextResponse.json({
      image: `data:image/png;base64,${finalPng.toString("base64")}`,
      shareUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poster generation failed." },
      { status: 500 },
    );
  }
}

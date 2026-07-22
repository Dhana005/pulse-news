import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { buildPosterBackgroundPrompt } from "@/lib/posterPrompt";
import { composePoster } from "@/lib/posterCompose";

// Internal content-creation tool, not a public reader feature — gated by a
// shared password (env var) since every generation is a billed OpenAI call.
//
// Background generation is AI (gpt-image-1-mini, quality "low", single
// reference image — no logo, colours are hardcoded in the prompt text
// instead of extracted from an image; see posterPrompt.ts). This is the
// cheapest AI-generated-background option — ~$0.004-0.006/poster.
// Other variants tried and reverted from are still in the repo if this
// gets revisited:
// - posterBackground.ts's generateTemplateBackground(): $0, code-only.
// - quality "medium" + logo+photo (2 images): ~$0.015/poster, the original.
// - quality "low" + logo+photo (2 images): ~$0.006-0.009/poster.
// See git history on this file for the exact call shapes.
export async function POST(request: NextRequest) {
  const adminPassword = process.env.POSTER_ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "POSTER_ADMIN_PASSWORD not configured on the server." }, { status: 500 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured on the server." }, { status: 500 });
  }

  const formData = await request.formData();
  const password = formData.get("password");
  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const image = formData.get("image");
  const headline = formData.get("headline");
  if (!(image instanceof File) || typeof headline !== "string" || !headline.trim()) {
    return NextResponse.json({ error: "image and headline are required." }, { status: 400 });
  }

  const banner = String(formData.get("banner") || "BREAKING NEWS");
  const description = String(formData.get("description") || "");
  const category = String(formData.get("category") || "");
  const date = String(
    formData.get("date") ||
      new Date().toLocaleDateString("ta-IN", { day: "numeric", month: "long", year: "numeric" }),
  );

  try {
    const client = new OpenAI({ apiKey });

    const uploadedBuffer = Buffer.from(await image.arrayBuffer());
    const uploadedFile = await toFile(uploadedBuffer, image.name || "photo.png", {
      type: image.type || "image/png",
    });

    // Step 1: AI generates the background/photo composition only — no text,
    // no logo, no shapes (see posterPrompt.ts for why).
    const response = await client.images.edit({
      model: "gpt-image-1-mini",
      image: [uploadedFile],
      prompt: buildPosterBackgroundPrompt(),
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "OpenAI returned no image data." }, { status: 502 });
    }
    const backgroundPng = Buffer.from(b64, "base64");

    // Step 2: composite the real logo + all text deterministically on top —
    // guarantees correct spelling and an accurate brand mark.
    const finalPng = await composePoster(backgroundPng, { banner, headline, description, category, date });

    return NextResponse.json({ image: `data:image/png;base64,${finalPng.toString("base64")}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poster generation failed." },
      { status: 500 },
    );
  }
}

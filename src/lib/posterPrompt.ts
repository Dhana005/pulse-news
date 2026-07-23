// Prompt for the PulseNews poster generator's background-image step
// (src/app/admin/poster). Deliberately asks the AI for a *background and
// photo composition only* — no text, no logo, no banner shapes. Current
// image models (including gpt-image-1-mini) cannot reliably render accurate
// non-Latin script text; asking for zero AI-rendered text and compositing
// every word (headline, description, banner, logo, footer) back on
// afterward via posterCompose.ts is what actually gets legible, correctly
// spelled Tamil onto the poster.

import type { PosterTheme } from "./posterThemes";

export interface PosterFields {
  banner: string;
  headline: string;
  description: string;
  category: string;
  date: string;
}

// withLogo=true describes a second reference image (the logo) attached
// purely so the AI can compose around its shape/placement — used by the
// "low"/"medium" plans. Colour always comes from the selected theme's exact
// hex codes (stated explicitly below) rather than being inferred from the
// logo, so the result is deterministic regardless of plan or logo.
export function buildPosterBackgroundPrompt(withLogo: boolean, theme: PosterTheme): string {
  const intro = withLogo
    ? `You are given two reference images: (1) a brand logo — for layout reference only, and (2) a news photograph.

Create a premium, editorial, square (1:1 aspect ratio) background composition for a social-media news poster.`
    : `You are given one reference image: a news photograph.

Create a premium, editorial, square (1:1 aspect ratio) background composition for a social-media news poster.`;

  return `You are an award-winning creative director for premium broadcast news graphics.

${intro}

Use this exact brand colour palette: primary ${theme.primary}, dark/navy ${theme.secondary}, accent ${theme.accent}, plus white and charcoal black. Avoid introducing unrelated colour schemes.

Enhance the provided news photograph — increase sharpness, improve lighting and contrast, balance colour, preserve natural skin tones and facial detail — and blend it into the composition as the dominant hero visual, filling roughly the top 60% of the canvas with a tasteful full-bleed or editorial crop depending on the photo's orientation.

Style the rest of the canvas using the palette above: soft gradients, subtle light effects, gentle glassmorphism, modern geometric accents, minimal texture, soft glow, elegant depth, soft shadows. Add a smooth, fairly dark gradient across the bottom 35% of the canvas (transitioning from the photo into the dark/navy tone) so that white text can later be placed over it with strong contrast and easy legibility.

CRITICAL CONSTRAINTS:
- Do not render ANY text, letters, numbers, words, captions, watermarks, or logos anywhere in the image.
- Do not draw banners, badges, buttons, borders, or UI shapes of any kind.
- Produce a clean photographic/background composition only — every piece of text and branding will be added separately afterward by a different process.`;
}

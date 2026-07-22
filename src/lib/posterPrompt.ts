// Prompt for the PulseNews poster generator's background-image step
// (src/app/admin/poster). Deliberately asks the AI for a *background and
// photo composition only* — no text, no logo, no banner shapes. Current
// image models (including gpt-image-1-mini) cannot reliably render accurate
// non-Latin script text; asking for zero AI-rendered text and compositing
// every word (headline, description, banner, logo, footer) back on
// afterward via posterCompose.ts is what actually gets legible, correctly
// spelled Tamil onto the poster.

export interface PosterFields {
  banner: string;
  headline: string;
  description: string;
  category: string;
  date: string;
}

// withLogo=true describes a second reference image (the logo) and asks the
// model to infer the palette from it — used by the "low"/"medium" plans
// that pass the logo as a reference. withLogo=false hardcodes the palette
// directly in the text instead, for plans that only send the photo (see
// route.ts's POSTER_PLANS).
export function buildPosterBackgroundPrompt(withLogo: boolean): string {
  const intro = withLogo
    ? `You are given two reference images: (1) a brand logo — use it ONLY to infer a colour palette (deep blue, navy, an electric-blue accent, white, charcoal black), and (2) a news photograph.

Create a premium, editorial, square (1:1 aspect ratio) background composition in that exact colour palette, for a social-media news poster.`
    : `You are given one reference image: a news photograph.

Create a premium, editorial, square (1:1 aspect ratio) background composition for a social-media news poster, using this exact brand colour palette: deep blue (#1e4d8c), navy (#0f2440), an electric-blue accent (#3d7ad9), white, and charcoal black. Avoid orange-heavy or unrelated colour schemes.`;

  return `You are an award-winning creative director for premium broadcast news graphics.

${intro}

Enhance the provided news photograph — increase sharpness, improve lighting and contrast, balance colour, preserve natural skin tones and facial detail — and blend it into the composition as the dominant hero visual, filling roughly the top 60% of the canvas with a tasteful full-bleed or editorial crop depending on the photo's orientation.

Style the rest of the canvas: deep blue/navy/black tones, soft gradients, subtle light effects, gentle glassmorphism, modern geometric accents, minimal texture, soft glow, elegant depth, soft shadows. Add a smooth, fairly dark gradient across the bottom 35% of the canvas (transitioning from the photo into deep navy/black) so that white text can later be placed over it with strong contrast and easy legibility.

CRITICAL CONSTRAINTS:
- Do not render ANY text, letters, numbers, words, captions, watermarks, or logos anywhere in the image.
- Do not draw banners, badges, buttons, borders, or UI shapes of any kind.
- Produce a clean photographic/background composition only — every piece of text and branding will be added separately afterward by a different process.`;
}

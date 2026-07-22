import sharp from "sharp";

// Code-only replacement for the OpenAI background-generation step (see
// posterPrompt.ts / route.ts for the AI version, kept in place in case this
// gets swapped back). $0 API cost, near-instant, and a consistent template
// look — arguably closer to "instantly recognisable PulseNews identity"
// than a uniquely AI-painted background every time.

const CANVAS = 1024;
const PHOTO_HEIGHT = 640; // top portion of the canvas the photo fills

async function enhancePhoto(photoBuffer: Buffer): Promise<Buffer> {
  return sharp(photoBuffer)
    .resize(CANVAS, PHOTO_HEIGHT, { fit: "cover", position: "attention" })
    .modulate({ brightness: 1.04, saturation: 1.18 })
    .linear(1.06, -8) // gentle contrast boost
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer();
}

// Fades the photo's own alpha channel to transparent across its bottom
// third, so it blends into the gradient background below it instead of
// having a hard seam.
async function fadePhotoBottom(photoBuffer: Buffer): Promise<Buffer> {
  const maskSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${PHOTO_HEIGHT}">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="62%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${CANVAS}" height="${PHOTO_HEIGHT}" fill="url(#fade)"/>
    </svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();
  return sharp(photoBuffer).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

function baseGradientSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e4d8c"/>
      <stop offset="45%" stop-color="#0f2440"/>
      <stop offset="100%" stop-color="#050b12"/>
    </linearGradient>
    <radialGradient id="glow1" cx="80%" cy="12%" r="45%">
      <stop offset="0%" stop-color="#3d7ad9" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3d7ad9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="8%" cy="92%" r="40%">
      <stop offset="0%" stop-color="#1e4d8c" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#1e4d8c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#base)"/>
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#glow1)"/>
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#glow2)"/>
  <!-- subtle geometric accent lines -->
  <line x1="0" y1="${PHOTO_HEIGHT + 40}" x2="${CANVAS}" y2="${PHOTO_HEIGHT + 10}" stroke="#3d7ad9" stroke-width="1.5" opacity="0.25"/>
  <circle cx="${CANVAS - 60}" cy="${CANVAS - 140}" r="120" fill="none" stroke="#3d7ad9" stroke-width="1" opacity="0.15"/>
</svg>`;
}

export async function generateTemplateBackground(photoBuffer: Buffer): Promise<Buffer> {
  const enhanced = await enhancePhoto(photoBuffer);
  const faded = await fadePhotoBottom(enhanced);
  const base = await sharp(Buffer.from(baseGradientSvg())).png().toBuffer();

  return sharp(base)
    .composite([{ input: faded, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

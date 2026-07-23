import sharp from "sharp";
import path from "path";
import type { PosterFields } from "./posterPrompt";
import { ensurePosterFontconfig } from "./posterFontconfig";
import type { PosterTheme } from "./posterThemes";

const FONT_FAMILY = "Hind Madurai";

const CANVAS = 1024;

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

// Approximate greedy word-wrap by character count. Tamil glyphs combine
// multiple Unicode codepoints per visual character, so this is not
// pixel-perfect — but it reliably avoids the AI-rendered-text failure mode
// (garbled/misspelled script), which matters far more than exact line
// breaks for a premium look.
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Shrinks font size until the text fits within maxLines at that size's
// implied chars-per-line, down to a floor size.
function fitText(
  text: string,
  contentWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  charWidthRatio = 0.62,
): { lines: string[]; fontSize: number } {
  let fontSize = startSize;
  while (fontSize >= minSize) {
    const maxCharsPerLine = Math.floor(contentWidth / (fontSize * charWidthRatio));
    const lines = wrapText(text, Math.max(maxCharsPerLine, 4));
    if (lines.length <= maxLines) return { lines, fontSize };
    fontSize -= 4;
  }
  const maxCharsPerLine = Math.floor(contentWidth / (minSize * charWidthRatio));
  return { lines: wrapText(text, Math.max(maxCharsPerLine, 4)).slice(0, maxLines), fontSize: minSize };
}

export async function composePoster(
  backgroundPng: Buffer,
  fields: PosterFields,
  theme: PosterTheme,
  customLogoBuffer?: Buffer,
): Promise<Buffer> {
  ensurePosterFontconfig();

  const contentWidth = CANVAS - 2 * 48; // 48px side margins

  const banner = fields.banner.toUpperCase();
  const isBreaking = /BREAKING|LIVE|URGENT/.test(banner);
  const bannerColor = isBreaking ? "#d32f2f" : theme.primary;
  const bannerCharWidth = 24 * 0.6;
  const bannerWidth = Math.min(contentWidth, Math.max(220, banner.length * bannerCharWidth + 56));

  const headline = fitText(fields.headline, contentWidth, 5, 56, 32);
  const headlineLineHeight = headline.fontSize * 1.22;

  const hasDescription = fields.description.trim().length > 0;
  const description = hasDescription
    ? fitText(fields.description, contentWidth, 4, 26, 18, 0.55)
    : { lines: [] as string[], fontSize: 26 };
  const descLineHeight = description.fontSize * 1.4;

  // Headline block anchored from the bottom, above the footer bar.
  const footerHeight = 64;
  const descBlockHeight = hasDescription ? description.lines.length * descLineHeight + 16 : 0;
  const headlineBlockHeight = headline.lines.length * headlineLineHeight;
  const headlineBottomY = CANVAS - footerHeight - 28 - descBlockHeight;
  const headlineStartY = headlineBottomY - headlineBlockHeight + headlineLineHeight * 0.8;

  const headlineTspans = headline.lines
    .map((line, i) => `<tspan x="48" y="${headlineStartY + i * headlineLineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const descStartY = headlineBottomY + descLineHeight * 0.8;
  const descTspans = description.lines
    .map((line, i) => `<tspan x="48" y="${descStartY + i * descLineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const badgeText = [fields.category, fields.date].filter(Boolean).join("  ·  ");
  const badgeWidth = Math.max(140, badgeText.length * 9 + 40);

  // Custom uploaded logo takes over compositing entirely when provided —
  // otherwise fall back to the built-in white PulseNews mark, which is
  // designed to sit on the dark backing pill below.
  const logoSource = customLogoBuffer ?? path.join(process.cwd(), "public", "logo-white.png");
  const logoBuffer = await sharp(logoSource).resize({ height: 40 }).toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width ?? 130;
  const logoPillWidth = logoWidth + 32;
  const logoPillHeight = 64;

  const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <style>
    .banner { font-family: '${FONT_FAMILY}'; font-weight: 700; }
    .headline { font-family: '${FONT_FAMILY}'; font-weight: 700; }
    .desc { font-family: '${FONT_FAMILY}'; font-weight: 600; }
    .badge { font-family: '${FONT_FAMILY}'; font-weight: 600; }
    .footer { font-family: '${FONT_FAMILY}'; font-weight: 600; }
  </style>

  <!-- Logo backing pill, top-left — solid enough to stay legible regardless
  of what's behind it in the uploaded photo. -->
  <rect x="12" y="12" width="${logoPillWidth}" height="${logoPillHeight}" rx="14" fill="rgba(5,11,18,0.62)"/>

  <!-- Title banner, top-centre -->
  <rect x="${(CANVAS - bannerWidth) / 2}" y="28" width="${bannerWidth}" height="52" rx="10" fill="${bannerColor}"/>
  <text class="banner" x="${CANVAS / 2}" y="63" font-size="24" fill="#ffffff" text-anchor="middle">${escapeXml(banner)}</text>

  <!-- Category / date badge, top-right -->
  ${badgeText ? `
  <rect x="${CANVAS - 40 - badgeWidth}" y="28" width="${badgeWidth}" height="40" rx="8" fill="rgba(5,11,18,0.62)"/>
  <text class="badge" x="${CANVAS - 40 - badgeWidth / 2}" y="53" font-size="15" fill="#ffffff" text-anchor="middle">${escapeXml(badgeText)}</text>
  ` : ""}

  <!-- Headline -->
  <text class="headline" font-size="${headline.fontSize}" fill="#ffffff">${headlineTspans}</text>

  <!-- Description -->
  ${hasDescription ? `<text class="desc" font-size="${description.fontSize}" fill="rgba(255,255,255,0.82)">${descTspans}</text>` : ""}

  <!-- Footer bar -->
  <rect x="0" y="${CANVAS - footerHeight}" width="${CANVAS}" height="${footerHeight}" fill="${theme.secondary}"/>
  <text class="footer" x="${CANVAS - 32}" y="${CANVAS - footerHeight / 2 + 6}" font-size="18" fill="#ffffff" text-anchor="end">www.pulsenewscast.com</text>
</svg>`;

  const background = await sharp(backgroundPng).resize(CANVAS, CANVAS, { fit: "cover" }).toBuffer();

  return sharp(background)
    .composite([
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
      { input: logoBuffer, top: 24, left: 28 },
    ])
    .png()
    .toBuffer();
}

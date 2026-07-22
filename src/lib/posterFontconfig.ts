import { mkdirSync, writeFileSync } from "fs";
import os from "os";
import path from "path";

// sharp's SVG text rendering goes through the fontconfig it bundles — but
// fontconfig's default search path (/etc/fonts/fonts.conf) doesn't exist on
// Vercel's serverless runtime, so it can't resolve ANY font there, custom or
// system (this is what caused every glyph, Tamil and plain Latin alike, to
// render as tofu boxes in production despite working locally). Generating
// our own minimal fonts.conf that points straight at the bundled Hind
// Madurai files — and pointing FONTCONFIG_FILE at it before the first
// render — sidesteps the missing default config entirely, on any host.
//
// This keeps text rendering on sharp's librsvg+pango+harfbuzz pipeline
// rather than switching renderers: harfbuzz's Indic shaping is correct for
// Tamil conjuncts/vowel-sign reordering, which is why this exists instead of
// @resvg/resvg-js — resvg's Rust shaping engine (rustybuzz) was verified to
// drop and misplace Tamil vowel signs on real headlines.
let initialized = false;

export function ensurePosterFontconfig(): void {
  if (initialized) return;

  const fontsDir = path.join(process.cwd(), "src", "lib", "fonts");
  const confDir = path.join(os.tmpdir(), "pulsenews-fontconfig");
  const cacheDir = path.join(confDir, "cache");
  mkdirSync(cacheDir, { recursive: true });

  const confPath = path.join(confDir, "fonts.conf");
  const xml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${cacheDir}</cachedir>
</fontconfig>
`;
  writeFileSync(confPath, xml);
  process.env.FONTCONFIG_FILE = confPath;
  initialized = true;
}

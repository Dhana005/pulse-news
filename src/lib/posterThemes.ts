// Poster colour themes — shared by the client picker (src/app/admin/poster)
// and the server-side generation pipeline (posterPrompt/posterBackground/
// posterCompose). Pure data, no server-only imports, so it's safe to import
// from a "use client" file too.

export interface PosterTheme {
  key: string;
  label: string;
  primary: string; // banner pill (non-breaking), AI prompt palette
  secondary: string; // footer bar, dark gradient stop
  accent: string; // glow/highlight accents
}

export const POSTER_THEMES: Record<string, PosterTheme> = {
  blue: { key: "blue", label: "PulseNews Blue (default)", primary: "#1e4d8c", secondary: "#0f2440", accent: "#3d7ad9" },
  red: { key: "red", label: "Crimson Red", primary: "#b91c1c", secondary: "#2a0a0a", accent: "#ef4444" },
  green: { key: "green", label: "Emerald Green", primary: "#0f6b4c", secondary: "#042018", accent: "#22c55e" },
  purple: { key: "purple", label: "Royal Purple", primary: "#5b21b6", secondary: "#1a0f2e", accent: "#a78bfa" },
  orange: { key: "orange", label: "Sunset Orange", primary: "#c2410c", secondary: "#2a0f04", accent: "#fb923c" },
};

export const DEFAULT_POSTER_THEME = "blue";

export function getPosterTheme(key: string | null | undefined): PosterTheme {
  return (key && POSTER_THEMES[key]) || POSTER_THEMES[DEFAULT_POSTER_THEME];
}

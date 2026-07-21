// Live cricket score for the sidebar "LIVE அப்டேட்ஸ்" widget. Needs
// CRICAPI_KEY (free tier at cricapi.com) — returns null without it, or if
// there's no live match right now, so the row just doesn't render.

export interface LiveMatch {
  name: string; // e.g. "India vs Australia, 3rd T20I"
  status: string; // e.g. "India 142/3 (15.2 ov)"
}

export async function getLiveMatch(): Promise<LiveMatch | null> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({ apikey: apiKey, offset: "0" });
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?${params}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== "success") return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const live = (json.data ?? []).find((m: any) => m.matchStarted && !m.matchEnded);
    if (!live) return null;

    const name: string = live.name ?? "";
    const status: string = live.status ?? "";
    if (!name || !status) return null;
    return { name, status };
  } catch {
    return null;
  }
}

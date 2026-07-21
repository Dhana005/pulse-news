// Current-weather badge in the header, plus a Chennai fallback used
// server-side (and by the sidebar widget) before/without browser geolocation.
// Needs OPENWEATHER_API_KEY (free tier at openweathermap.org) — returns null
// without it so the badge just doesn't render rather than breaking the page.

export interface Weather {
  tempC: number;
  condition: string; // OpenWeatherMap's "main" field, e.g. "Clear", "Rain"
  city: string;
}

const CONDITION_ICON: Record<string, string> = {
  Clear: "☀",
  Clouds: "☁",
  Rain: "🌧",
  Drizzle: "🌦",
  Thunderstorm: "⛈",
  Snow: "❄",
  Mist: "🌫",
  Haze: "🌫",
  Fog: "🌫",
};

export function weatherIcon(condition: string): string {
  return CONDITION_ICON[condition] ?? "🌤";
}

async function fetchWeather(params: URLSearchParams): Promise<Weather | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    params.set("units", "metric");
    params.set("appid", apiKey);
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const tempC = json?.main?.temp;
    const condition = json?.weather?.[0]?.main;
    const city = json?.name;
    if (typeof tempC !== "number" || typeof condition !== "string" || typeof city !== "string") return null;
    return { tempC: Math.round(tempC), condition, city };
  } catch {
    return null;
  }
}

export async function getChennaiWeather(): Promise<Weather | null> {
  return fetchWeather(new URLSearchParams({ q: "Chennai,IN" }));
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<Weather | null> {
  return fetchWeather(new URLSearchParams({ lat: String(lat), lon: String(lon) }));
}

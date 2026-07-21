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

async function fetchWeather(params: URLSearchParams, cityOverride?: string): Promise<Weather | null> {
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
    const city = cityOverride ?? json?.name;
    if (typeof tempC !== "number" || typeof condition !== "string" || typeof city !== "string") return null;
    return { tempC: Math.round(tempC), condition, city };
  } catch {
    return null;
  }
}

// OpenWeatherMap's /weather endpoint only ever returns city names in English.
// Its Geocoding API's reverse lookup separately exposes `local_names`, which
// includes a Tamil transliteration for most places when one exists.
async function getTamilCityName(lat: number, lon: number): Promise<string | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), limit: "1", appid: apiKey });
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?${params}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.[0]?.local_names?.ta ?? null;
  } catch {
    return null;
  }
}

export async function getChennaiWeather(): Promise<Weather | null> {
  return fetchWeather(new URLSearchParams({ q: "Chennai,IN" }), "சென்னை");
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<Weather | null> {
  const [weather, tamilCity] = await Promise.all([
    fetchWeather(new URLSearchParams({ lat: String(lat), lon: String(lon) })),
    getTamilCityName(lat, lon),
  ]);
  if (!weather) return null;
  return tamilCity ? { ...weather, city: tamilCity } : weather;
}

import { NextRequest, NextResponse } from "next/server";
import { getWeatherByCoords } from "@/lib/weather";

// Called client-side by WeatherBadge once the browser shares geolocation —
// keeps OPENWEATHER_API_KEY server-only instead of exposing it to the client.
export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lonParam = request.nextUrl.searchParams.get("lon");
  const lat = latParam ? Number(latParam) : NaN;
  const lon = lonParam ? Number(lonParam) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "invalid lat/lon" }, { status: 400 });
  }

  const weather = await getWeatherByCoords(lat, lon);
  if (!weather) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  return NextResponse.json(weather);
}

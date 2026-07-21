"use client";

import { useEffect, useState } from "react";
import { weatherIcon, type Weather } from "@/lib/weather";

// Renders the server-fetched Chennai fallback immediately, then swaps in the
// visitor's actual location if they grant geolocation permission.
export default function WeatherBadge({ initial }: { initial: Weather | null }) {
  const [weather, setWeather] = useState(initial);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const params = new URLSearchParams({
            lat: String(position.coords.latitude),
            lon: String(position.coords.longitude),
          });
          const res = await fetch(`/api/weather?${params}`);
          if (!res.ok) return;
          setWeather(await res.json());
        } catch {
          // keep the Chennai fallback
        }
      },
      () => {
        // permission denied/unavailable — keep the Chennai fallback
      },
      { timeout: 8000, maximumAge: 1800_000 },
    );
  }, []);

  if (!weather) return null;

  return (
    <span className="flex items-center gap-1.5 text-[13.5px] text-text-muted whitespace-nowrap">
      <span aria-hidden="true">{weatherIcon(weather.condition)}</span>
      {weather.city} {weather.tempC}°
    </span>
  );
}

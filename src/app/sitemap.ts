import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["/ta", "/ta/faq", "/ta/privacy", "/ta/terms"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "/ta" ? 1 : 0.5,
  }));

  const categoryRoutes = CATEGORIES.map((category) => ({
    url: `${BASE_URL}/ta/${category.key}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes];
}

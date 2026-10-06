/*
 * app/sitemap.ts — XML sitemap.
 * Why: gym profiles are the SEO surface of CHOQUE (spec 5.1). This emits the
 * marketing page plus every published gym detail URL so crawlers can find
 * them without following client-side navigation.
 */
import type { MetadataRoute } from "next";
import { GYMS } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://choque.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ...GYMS.map((g) => ({
      url: `${BASE}/gyms/${g.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

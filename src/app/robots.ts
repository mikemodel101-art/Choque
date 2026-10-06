/*
 * app/robots.ts — crawler rules.
 * Why: the public directory should be indexed, but private surfaces (the
 * notebook, profile, admin tooling and API routes) must never be crawled.
 */
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://choque.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gyms"],
        disallow: ["/admin", "/api", "/notebook", "/profile", "/onboarding"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}

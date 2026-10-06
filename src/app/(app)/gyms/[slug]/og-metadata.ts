/*
 * og-metadata.ts — per-gym Open Graph/Twitter metadata helper.
 * Why: gym profiles are CHOQUE's share surface. Each gym links its
 * auto-generated OG image (/api/og/gym?slug=…) plus gym-specific titles so a
 * pasted URL unfurls with name, area and rating rather than generic app text.
 */
import type { Metadata } from "next";
import type { Gym } from "@/lib/types";

export function gymMetadata(gym: Gym): Metadata {
  const description = `${gym.name} in ${gym.neighborhood ?? gym.city}, ${gym.state} — ${gym.rating.toFixed(1)}★, from $${gym.priceFrom}/mo, $${gym.dropIn} drop-in. ${gym.disciplines.join(", ").toUpperCase()}.`;
  return {
    title: `${gym.name} — ${gym.city}`,
    description,
    openGraph: {
      title: `${gym.name} · CHOQUE`,
      description,
      images: [{ url: `/api/og/gym?slug=${gym.slug}`, width: 1200, height: 630, alt: gym.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${gym.name} · CHOQUE`,
      description,
    },
  };
}

export function ogJsonLd(gym: Gym) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: gym.name,
    url: `https://choque.app/gyms/${gym.slug}`,
    image: `https://choque.app/api/og/gym?slug=${gym.slug}`,
  };
}

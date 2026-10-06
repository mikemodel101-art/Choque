/*
 * next.config.ts — Next.js configuration.
 * Why: allows next/image to optimize the stock photography served from Pexels
 * and Unsplash CDNs that powers gym cards, hero imagery, and galleries.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

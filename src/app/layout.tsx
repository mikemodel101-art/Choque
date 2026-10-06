/*
 * app/layout.tsx — root layout.
 * Why: injects the Inter variable font (spec typography), sets theme-aware
 * viewport colors, mounts global providers (theme, query, session, toasts),
 * and enables Vercel Analytics for production traffic.
 */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CHOQUE — Find your mat family",
    template: "%s · CHOQUE",
  },
  description:
    "A community platform by Shoyoroll for martial-arts practitioners. Find gyms, training partners, and open mats — and keep a private training notebook.",
  keywords: ["bjj", "judo", "wrestling", "mma", "muay thai", "open mat", "grappling"],
  manifest: "/manifest.webmanifest",
  applicationName: "CHOQUE",
  appleWebApp: { capable: true, title: "CHOQUE", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "CHOQUE",
    title: "CHOQUE — Find your mat family",
    description:
      "Find gyms, training partners and open mats — and keep a private training notebook.",
  },
  twitter: { card: "summary_large_image", title: "CHOQUE", description: "Find your mat family." },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}

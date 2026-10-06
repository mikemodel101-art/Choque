/*
 * app/page.tsx — public landing route.
 * Why: the marketing page is a client component (framer-motion), so the route
 * file stays a tiny server component that only sets page metadata.
 */
import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "CHOQUE — Find your mat family",
};

export default function Page() {
  return <Landing />;
}

/*
 * app/(app)/layout.tsx — protected route-group layout.
 * Why: every screen inside the product (gyms, partners, open mats, notebook,
 * profile) shares the authenticated shell and guard; grouping them here keeps
 * auth chrome out of the marketing and sign-in routes.
 */
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

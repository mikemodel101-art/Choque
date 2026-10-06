/*
 * app/(app)/staff/page.tsx — legacy redirect.
 * Why: staff tooling moved to /admin (gated by middleware with admin-only
 * subsections). This keeps old links and bookmarks working.
 */
import { redirect } from "next/navigation";

export default function StaffRedirect() {
  redirect("/admin");
}

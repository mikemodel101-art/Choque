/*
 * app/admin/layout.tsx — admin shell.
 * Why: /admin is gated three ways — Next middleware (edge redirect),
 * this client guard (fast feedback + reduced menu by role), and the demo API
 * which re-checks capabilities on every mutation. Moderators see a reduced
 * menu (queue + claims only); admins additionally get Users, Analytics and
 * the Audit log.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Flag,
  LayoutDashboard,
  Mail,
  Crown,
  FileCheck2,
  KeyRound,
  ScrollText,
  ShieldCheck,
  ShieldX,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRole } from "@/components/can";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { roleLabel } from "@/lib/demo-accounts";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, adminOnly: false, exact: true },
  { href: "/admin/queue", label: "Review queue", icon: FileCheck2, adminOnly: false, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, adminOnly: false, exact: false },
  { href: "/admin/gyms", label: "Gyms", icon: Building2, adminOnly: false, exact: false },
  { href: "/admin/claims", label: "Gym claims", icon: KeyRound, adminOnly: false, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, adminOnly: true, exact: false },
  { href: "/admin/emails", label: "Emails", icon: Mail, adminOnly: false, exact: false },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, adminOnly: true, exact: false },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const role = useRole();

  if (role.loading) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">Checking access…</div>;
  }

  if (!role.isStaff) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <EmptyState
          icon={ShieldX}
          title="Staff access required"
          description="The review queue, user management and audit log are limited to moderators and admins. This check runs on the server too."
          action={<Link href="/gyms"><Button variant="secondary">Back to CHOQUE</Button></Link>}
        />
      </main>
    );
  }

  const items = NAV.filter((i) => !i.adminOnly || role.isAdmin);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/gyms" aria-label="Back to CHOQUE"><Logo /></Link>
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            role.isAdmin ? "bg-accent text-white" : "bg-accent-soft text-accent",
          )}>
            {role.isAdmin ? <Crown className="size-3" /> : <ShieldCheck className="size-3" />}
            {roleLabel(role.role)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/gyms"
              className="inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-sm text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground lg:h-10"
            >
              <ArrowLeft className="size-4" /> Exit admin
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6" aria-label="Admin sections">
          {items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-foreground/[0.05] hover:text-foreground",
                )}
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

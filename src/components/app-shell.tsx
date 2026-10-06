/*
 * components/app-shell.tsx — authenticated app frame.
 * Why: layout spec v2.3 — mobile-first: an iOS-style bottom tab bar (1.
 * Gyms, 2. Open Mats, 3. Partners, 4. Notebook, 5. Profile) with a shared
 * layoutId pill sliding under the active tab, and a slim top bar with the
 * primary nav centered on desktop. Drag the tab pill and all content to
 * 44px+ touch targets; iOS safe-area insets are respected on every edge.
 * This shell also owns the demo auth guard + loading state so protected
 * pages never flash unauthenticated content.
 */
"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck2,
  Crown,
  Inbox,
  LogOut,
  Search,
  Mail,
  NotebookPen,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand";
import { useSession } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/command-palette";
import { roleLabel } from "@/lib/demo-accounts";
import { caps } from "@/lib/permissions";
import { useMotionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";

const NAV = [
  { href: "/gyms", label: "Gyms", icon: Building2 },
  { href: "/open-mats", label: "Open mats", icon: CalendarCheck2 },
  { href: "/partners", label: "Partners", icon: Users },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading CHOQUE">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, signOut } = useSession();
  const enabled = useMotionEnabled();
  const { data: suspended } = useQuery({
    queryKey: ["me", "suspended", session?.email],
    queryFn: () => Promise.resolve(api.isCurrentUserSuspended()),
    enabled: !!session,
  });
  // Unanswered incoming requests drive the inbox badge.
  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: api.listConnections,
    enabled: !!session,
  });
  const pendingRequests = (connections ?? []).filter(
    (c) => c.direction === "incoming" && c.status === "pending",
  ).length;

  useEffect(() => {
    if (!loading && !session) router.replace("/sign-in");
  }, [loading, session, router]);

  // First-ever sign-in: acknowledge the respectful-training code before using the app.
  useEffect(() => {
    if (!loading && session && typeof window !== "undefined" && !localStorage.getItem("choque:v1:guidelines-ack"))
      router.replace("/welcome");
  }, [loading, session, router]);

  if (loading || !session) return <LoadingScreen />;
  const c = caps(session, { suspended: !!suspended });

  return (
    <div className="min-h-dvh">
      {/* ——— Top bar: logo left · primary nav center (desktop) · actions right ——— */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/gyms" aria-label="CHOQUE home" className="shrink-0"><Logo /></Link>

          {/* Desktop primary nav, centered */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "text-accent" : "text-muted hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={enabled ? "top-nav-pill" : undefined}
                      className="absolute inset-0 rounded-full bg-accent-soft"
                      aria-hidden
                      transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              aria-label="Open command palette (⌘K)"
              title="Command palette — ⌘K"
              className="inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent lg:size-10"
            >
              <Search className="size-[18px]" />
            </button>
            <Link
              href="/requests"
              aria-label={pendingRequests > 0 ? `Requests, ${pendingRequests} awaiting you` : "Requests"}
              title="Requests"
              className="relative inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent lg:size-10"
            >
              <Inbox className="size-[18px]" />
              {pendingRequests > 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </Link>
            {c.isStaff && (
              <Link
                href="/staff"
                aria-label="Open staff review tools"
                title="Staff tools"
                className="inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent lg:size-10"
              >
                <ShieldCheck className="size-[18px]" />
              </Link>
            )}
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 lg:flex">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                  suspended
                    ? "bg-warning/15 text-warning"
                    : session.role === "admin"
                      ? "bg-accent text-white"
                      : session.role === "moderator"
                        ? "bg-accent-soft text-accent"
                        : "bg-foreground/[0.06] text-muted",
                )}
              >
                {suspended ? <ShieldAlert className="size-3" /> : session.role === "admin" ? <Crown className="size-3" /> : c.isStaff ? <ShieldCheck className="size-3" /> : null}
                {suspended ? "Suspended" : roleLabel(session.role)}
              </span>
              <span className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-1">
                <Avatar name={session.name} size="sm" className="size-7 text-[10px]" />
                <span className="max-w-28 truncate text-xs font-medium">{session.name}</span>
              </span>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent lg:size-10"
              >
                <LogOut className="size-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Suspension notice: read-only access to your own data + appeal route */}
      {suspended && (
        <div role="status" className="border-b border-warning/30 bg-warning/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-xs font-medium text-warning">
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="size-4" />
              Your account is suspended. You can still browse and read your own notebook, but posting,
              submissions and connection requests are disabled.
            </span>
            <a
              href={`mailto:appeals@choque.app?subject=${encodeURIComponent("Suspension appeal — " + session.email)}&body=${encodeURIComponent("Hi CHOQUE team,\n\nI'd like to appeal the suspension on my account (" + session.email + ").\n\n")}`}
              className="inline-flex items-center gap-1 rounded-sm bg-warning/20 px-2.5 py-1 underline-offset-4 transition-colors hover:bg-warning/30 hover:underline"
            >
              <Mail className="size-3.5" /> Appeal this decision
            </a>
          </div>
        </div>
      )}

      <CommandPalette />

      {/* ——— Content ——— */}
      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-8">{children}</div>
      </main>

      {/* ——— Mobile bottom tab bar with sliding active pill ——— */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Primary mobile"
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={enabled ? "tab-pill" : undefined}
                    className="absolute inset-x-2 top-1 bottom-1 rounded-full bg-accent-soft"
                    aria-hidden
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon className="relative size-5" aria-hidden />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

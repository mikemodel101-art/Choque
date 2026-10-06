/*
 * app/admin/layout.tsx — SaaS-style admin shell.
 * Why: staff tooling benefits from a persistent left sidebar (like every
 * traditional admin platform): grouped sections, always-visible labels, badge
 * counts on the queues that need attention, a collapse toggle for more table
 * room, and a mobile drawer that keeps the same structure. Role gating still
 * happens here (moderators see a reduced set) AND server-side in the API —
 * hiding a menu item is never the security boundary.
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  FileCheck2,
  Flag,
  KeyRound,
  LayoutDashboard,
  Mail,
  Menu,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  ShieldX,
  Users,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useRole } from "@/components/can";
import { roleLabel } from "@/lib/demo-accounts";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Admin-only sections are hidden from moderators. */
  adminOnly?: boolean;
  exact?: boolean;
  /** Queue badge: number of items needing attention. */
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Seed every admin surface with bulk demo data on the first staff visit.
  useEffect(() => {
    if (!role.loading && role.isStaff) {
      import("@/lib/seed-admin").then((m) => m.ensureAdminSeed());
    }
  }, [role.loading, role.isStaff]);

  // Collapse preference persists between visits.
  useEffect(() => {
    const saved = localStorage.getItem("choque:v1:admin-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("choque:v1:admin-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Live queue counts for the badges.
  const { data: submissions } = useQuery({
    queryKey: ["submissions", { mineOnly: false }],
    queryFn: () => api.listSubmissions(false),
    enabled: role.isStaff,
    retry: false,
  });
  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: api.listReports,
    enabled: role.isStaff,
    retry: false,
  });
  const { data: claims } = useQuery({
    queryKey: ["claims"],
    queryFn: api.listClaims,
    enabled: role.isStaff,
    retry: false,
  });

  if (role.loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted" role="status">
        Checking access…
      </div>
    );
  }

  if (!role.isStaff) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <EmptyState
          icon={ShieldX}
          title="Staff access required"
          description="The review queue, user management and audit log are limited to moderators and admins. This check also runs on the server."
          action={<Link href="/gyms"><Button variant="secondary">Back to CHOQUE</Button></Link>}
        />
      </main>
    );
  }

  const pendingListings = (submissions ?? []).filter((s) => s.status === "pending").length;
  const openReports = (reports ?? []).filter((r) => r.status === "open").length;
  const pendingClaims = (claims ?? []).filter((c) => c.status === "pending").length;

  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
    },
    {
      title: "Moderation",
      items: [
        { href: "/admin/queue", label: "Review queue", icon: FileCheck2, badge: pendingListings },
        { href: "/admin/reports", label: "Reports", icon: Flag, badge: openReports },
        { href: "/admin/claims", label: "Gym claims", icon: KeyRound, badge: pendingClaims },
      ],
    },
    {
      title: "Directory",
      items: [
        { href: "/admin/gyms", label: "Gyms", icon: Building2 },
        { href: "/admin/open-mats", label: "Open mats", icon: CalendarCheck2 },
        { href: "/admin/partners", label: "Partners", icon: Users },
        { href: "/admin/notebook", label: "My notebook", icon: NotebookPen },
      ],
    },
    {
      title: "People",
      items: [{ href: "/admin/users", label: "Users & roles", icon: Users, adminOnly: true }],
    },
    {
      title: "Insights",
      items: [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3, adminOnly: true }],
    },
    {
      title: "System",
      items: [
        { href: "/admin/emails", label: "Email templates", icon: Mail },
        { href: "/admin/audit", label: "Audit log", icon: ScrollText, adminOnly: true },
      ],
    },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || role.isAdmin) }))
    .filter((g) => g.items.length > 0);

  /* ——— Sidebar body (shared by desktop rail + mobile drawer) ——— */
  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-border px-4", collapsed && "lg:justify-center lg:px-2")}>
        <Link href="/admin" aria-label="CHOQUE admin home" className="flex min-w-0 items-center gap-2">
          <Logo />
        </Link>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            role.isAdmin ? "bg-accent text-white" : "bg-accent-soft text-accent",
            collapsed && "lg:hidden",
          )}
        >
          {role.isAdmin ? <Crown className="size-3" /> : <ShieldCheck className="size-3" />}
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Admin sections">
        {visible.map((group) => (
          <div key={group.title}>
            <p
              className={cn(
                "px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70",
                collapsed && "lg:text-center lg:px-0",
              )}
            >
              {collapsed ? "·" : group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-muted hover:bg-foreground/[0.05] hover:text-foreground",
                        collapsed && "lg:justify-center lg:px-0",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />
                      )}
                      <item.icon className="size-[18px] shrink-0" aria-hidden />
                      <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{item.label}</span>
                      {!!item.badge && item.badge > 0 && (
                        <span
                          className={cn(
                            "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                            active ? "bg-accent text-white" : "bg-accent/15 text-accent",
                            collapsed && "lg:hidden",
                          )}
                          aria-label={`${item.badge} awaiting review`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: who's signed in + actions */}
      <div className="shrink-0 border-t border-border p-2">
        <div className={cn("flex items-center gap-2.5 rounded-sm p-2", collapsed && "lg:justify-center")}>
          <Avatar name={role.name ?? "Staff"} size="sm" />
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="truncate text-sm font-medium">{role.name}</p>
            <p className="truncate text-[11px] text-muted">{roleLabel(role.role)}</p>
          </div>
        </div>

        <div className={cn("flex items-center gap-1 px-1 pb-1", collapsed && "lg:flex-col")}>
          <Link
            href="/gyms"
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            title="Exit admin"
          >
            <X className="size-4" />
            <span className={cn(collapsed && "lg:hidden")}>Exit admin</span>
          </Link>
          <ThemeToggle />
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm py-2 text-[11px] font-medium text-muted/80 transition-colors hover:bg-foreground/[0.05] hover:text-foreground lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <CommandPalette />

      {/* ——— Desktop sidebar rail ——— */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-surface/70 backdrop-blur-sm transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {sidebar}
      </aside>

      {/* ——— Mobile top bar + drawer ——— */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/admin" aria-label="CHOQUE admin home"><Logo /></Link>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            role.isAdmin ? "bg-accent text-white" : "bg-accent-soft text-accent",
          )}
        >
          {role.isAdmin ? <Crown className="size-3" /> : <ShieldCheck className="size-3" />}
          {roleLabel(role.role)}
        </span>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-[17rem] max-w-[86vw] border-r border-border bg-surface shadow-2">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 grid size-9 place-items-center rounded-sm text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* ——— Content ——— */}
      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <div className="mx-auto max-w-6xl px-4 py-6 pb-16 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

/*
 * app/admin/page.tsx — moderation dashboard (staff landing).
 * Why: spec 5.6 opens with counts — pending gyms, pending open mats, open
 * reports, new users this week — so staff can see the workload at a glance
 * and jump straight into the right queue. Admin-only tiles (users, audit)
 * are hidden from moderators by <Can>.
 */
"use client";

import Link from "next/link";
import {
  Activity, Building2, CalendarCheck2, Crown, FileCheck2, Flag, KeyRound,
  ScrollText, UserPlus, Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useDemoUsers, useEventLog, useSubmissions } from "@/lib/hooks";
import { Can, useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { StatGrid } from "./dashboard-cards";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";

export default function AdminDashboardPage() {
  const role = useRole();
  const { data: submissions, isLoading } = useSubmissions(false);
  const { data: users } = useDemoUsers();
  const { data: events } = useEventLog();
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: api.listReports, retry: false });
  const { data: claims } = useQuery({ queryKey: ["claims"], queryFn: api.listClaims });

  const pending = submissions ?? [];
  const pendingGyms = pending.filter((s) => s.kind === "gym" && s.status === "pending").length;
  const pendingMats = pending.filter((s) => s.kind === "open_mat" && s.status === "pending").length;
  const openReports = (reports ?? []).filter((r) => r.status === "open").length;
  const pendingClaims = (claims ?? []).filter((c) => c.status === "pending").length;

  const weekAgo = Date.now() - 7 * 864e5;
  const newUsers = (events ?? []).filter(
    (e) => e.type === "auth.sign_in" && new Date(e.at).getTime() > weekAgo,
  ).length;

  const recent = (events ?? []).slice(0, 8);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title={`Moderation dashboard`}
          description={`Welcome back, ${role.name ?? "staff"}. Here's what needs attention.`}
        />

        {isLoading ? (
          <Skeleton className="h-24 rounded-md" />
        ) : (
          <StatGrid
            tiles={[
              { label: "Pending gyms", value: pendingGyms, icon: Building2, href: "/admin/queue", tone: "alert" },
              { label: "Pending open mats", value: pendingMats, icon: CalendarCheck2, href: "/admin/queue", tone: "alert" },
              { label: "Open reports", value: openReports, icon: Flag, href: "/admin/reports", tone: "alert" },
              { label: "Sign-ins this week", value: newUsers, icon: UserPlus, href: "/admin/analytics" },
            ]}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title="Your queues" description="Jump straight to work" />
            <ul className="mt-4 space-y-2">
              {[
                { href: "/admin/queue", icon: FileCheck2, label: "Listing review queue", count: pendingGyms + pendingMats },
                { href: "/admin/reports", icon: Flag, label: "Reports", count: openReports },
                { href: "/admin/claims", icon: KeyRound, label: "Gym ownership claims", count: pendingClaims },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-sm border border-border p-3 transition-colors hover:border-accent/50 hover:bg-accent-soft/20"
                  >
                    <item.icon className="size-4 text-accent" />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.count > 0
                      ? <Badge variant="accent">{item.count}</Badge>
                      : <span className="text-xs text-muted">clear</span>}
                  </Link>
                </li>
              ))}

              <Can role="admin">
                <li>
                  <Link href="/admin/users" className="flex items-center gap-3 rounded-sm border border-border p-3 transition-colors hover:border-accent/50 hover:bg-accent-soft/20">
                    <Users className="size-4 text-accent" />
                    <span className="flex-1 text-sm font-medium">Users &amp; roles</span>
                    <Badge variant="muted">{(users ?? []).length}</Badge>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/audit" className="flex items-center gap-3 rounded-sm border border-border p-3 transition-colors hover:border-accent/50 hover:bg-accent-soft/20">
                    <ScrollText className="size-4 text-accent" />
                    <span className="flex-1 text-sm font-medium">Audit log</span>
                    <Crown className="size-3.5 text-muted" />
                  </Link>
                </li>
              </Can>
            </ul>

            <Can role="moderator">
              <p className="mt-4 rounded-sm bg-foreground/[0.04] p-3 text-xs text-muted">
                You have moderator access: review listings, handle reports and suspend members.
                Role changes, unsuspending and the audit log are admin-only.
              </p>
            </Can>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Recent activity" description="Latest events across CHOQUE" />
            <ul className="mt-4 space-y-2.5">
              {recent.length === 0 && <li className="text-sm text-muted">No activity recorded yet.</li>}
              {recent.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 text-sm">
                  <Activity className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block break-words">{e.detail}</span>
                    <span className="block text-xs text-muted/70">{new Date(e.at).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

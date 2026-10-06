/*
 * app/admin/analytics/page.tsx — full analytics (ADMIN ONLY).
 * Why: spec 5.7 — weekly signups, top searched cities, zero-result searches
 * (so the team knows where to add gyms next) and top gyms, drawn with
 * Recharts. Everything is computed from the in-app `events` log; there are no
 * third-party trackers and Do Not Track is honoured at the source, so a DNT
 * browser simply produces an empty dataset.
 */
"use client";

import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, BarChart3, SearchX, ShieldX, TrendingUp, Users } from "lucide-react";
import { useEventLog, useDemoUsers, useSubmissions } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { dntEnabled } from "@/lib/api";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { StatGrid } from "../dashboard-cards";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";

/** Pull `key=value` pairs back out of an event detail string. */
function props(detail: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of detail.split(" ")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

const AXIS = { stroke: "var(--muted)", fontSize: 11 };

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "color-mix(in srgb, var(--foreground) 5%, transparent)" }}
      contentStyle={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontSize: 12,
        color: "var(--foreground)",
        boxShadow: "var(--shadow-2)",
      }}
    />
  );
}

export default function AdminAnalyticsPage() {
  const role = useRole();
  const { data: events, isLoading } = useEventLog();
  const { data: users } = useDemoUsers();
  const { data: submissions } = useSubmissions(false);

  const ev = useMemo(() => events ?? [], [events]);

  /* Weekly signups — sign-in events bucketed by day for the last 8 weeks. */
  const signups = useMemo(() => {
    const weeks: { label: string; signups: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = Date.now() - w * 7 * 864e5;
      const start = end - 7 * 864e5;
      weeks.push({
        label: new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        signups: ev.filter((e) => {
          const t = new Date(e.at).getTime();
          return e.type === "auth.sign_in" && t > start && t <= end;
        }).length,
      });
    }
    return weeks;
  }, [ev]);

  /* Top searched cities + zero-result searches. */
  const searches = useMemo(() => ev.filter((e) => e.type.startsWith("search.")), [ev]);

  const topCities = useMemo(() => {
    const map = new Map<string, number>();
    searches.forEach((e) => {
      const city = props(e.detail).city;
      if (city && city !== "any") map.set(city, (map.get(city) ?? 0) + 1);
    });
    return [...map.entries()].map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [searches]);

  const zeroResults = useMemo(() => {
    const map = new Map<string, number>();
    searches.filter((e) => props(e.detail).zero === "true").forEach((e) => {
      const p = props(e.detail);
      const label = [p.q !== "(none)" ? p.q : null, p.city !== "any" ? p.city : null]
        .filter(Boolean).join(" · ") || "(empty query)";
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return [...map.entries()].map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [searches]);

  /* Top gyms by profile views. */
  const topGyms = useMemo(() => {
    const map = new Map<string, number>();
    ev.filter((e) => e.type === "gyms.view").forEach((e) => {
      const name = e.detail.replace(/^Viewed /, "");
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return [...map.entries()].map(([gym, views]) => ({ gym, views }))
      .sort((a, b) => b.views - a.views).slice(0, 6);
  }, [ev]);

  const connectionsSent = ev.filter((e) => e.type === "connection.sent").length;
  const connectionsAccepted = ev.filter((e) => e.type === "connection.accepted").length;
  const notesCreated = ev.filter((e) => e.type === "note.created").length;
  const matsSubmitted = (submissions ?? []).filter((s) => s.kind === "open_mat").length;

  if (!role.loading && !role.isAdmin) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Admins only"
        description="Moderators see summary counts on the dashboard; the full analytics view is admin-only."
      />
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="First-party only — no tracking cookies, no third-party scripts, and Do Not Track is respected."
        />

        {dntEnabled() && (
          <p role="status" className="rounded-sm border border-border bg-foreground/[0.04] px-4 py-3 text-xs text-muted">
            Your browser sends Do Not Track, so this session records nothing. Existing data still displays.
          </p>
        )}

        <StatGrid
          tiles={[
            { label: "Requests sent", value: connectionsSent, icon: Users },
            { label: "Requests accepted", value: connectionsAccepted, icon: TrendingUp },
            { label: "Notes created", value: notesCreated, icon: Activity },
            { label: "Open mats submitted", value: matsSubmitted, icon: BarChart3 },
          ]}
        />

        {isLoading ? (
          <Skeleton className="h-72 rounded-md" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Weekly signups */}
            <Card className="p-5 lg:col-span-2">
              <SectionTitle title="Signups per week" description="Account activity over the last eight weeks" />
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signups} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip />
                    <Area type="monotone" dataKey="signups" stroke="var(--accent)" strokeWidth={2} fill="url(#signupFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top searched cities */}
            <Card className="p-5">
              <SectionTitle title="Top searched cities" description="Where demand is coming from" />
              {topCities.length === 0 ? (
                <p className="mt-6 text-sm text-muted">No city searches recorded yet.</p>
              ) : (
                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCities} layout="vertical" margin={{ left: 24, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="city" type="category" tick={AXIS} tickLine={false} axisLine={false} width={88} />
                      <ChartTooltip />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="var(--accent)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Zero-result searches */}
            <Card className="p-5">
              <SectionTitle
                title="Zero-result searches"
                description="Add gyms here first — people looked and found nothing"
              />
              {zeroResults.length === 0 ? (
                <p className="mt-6 flex items-center gap-2 text-sm text-success">
                  <SearchX className="size-4" /> Every search returned results. Nice.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {zeroResults.map((z) => (
                    <li key={z.term} className="flex items-center justify-between gap-3 rounded-sm border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{z.term}</span>
                      <span className="shrink-0 font-semibold text-warning">{z.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Top gyms */}
            <Card className="p-5 lg:col-span-2">
              <SectionTitle title="Most viewed gyms" description="Profile views across the directory" />
              {topGyms.length === 0 ? (
                <p className="mt-6 text-sm text-muted">No gym views recorded yet.</p>
              ) : (
                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topGyms} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="gym" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-12} dy={8} height={48} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                      <ChartTooltip />
                      <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                        {topGyms.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 55%, transparent)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        )}

        <p className="text-xs text-muted">
          {(users ?? []).length} accounts · {ev.length} events stored locally. See the{" "}
          <a href="/legal/privacy" className="text-accent underline-offset-4 hover:underline">privacy page</a>{" "}
          for exactly what is collected and why.
        </p>
      </div>
    </PageTransition>
  );
}

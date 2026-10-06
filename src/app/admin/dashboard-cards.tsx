/*
 * app/admin/dashboard-cards.tsx — shared stat tiles for the admin dashboard.
 * Why: the dashboard, the queue and the reports page all surface the same
 * four counts (pending gyms, pending open mats, open reports, new users this
 * week). One component keeps the numbers and their styling identical.
 */
"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatTile {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  tone?: "default" | "alert";
}

export function StatGrid({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => {
        const body = (
          <Card
            className={cn(
              "h-full p-4 transition-all",
              t.href && "hover:-translate-y-0.5 hover:shadow-2",
              t.tone === "alert" && Number(t.value) > 0 && "border-accent/40 bg-accent-soft/30",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <t.icon className="size-3.5 text-accent" /> {t.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{t.value}</p>
          </Card>
        );
        return t.href ? (
          <Link key={t.label} href={t.href} className="focus-visible:outline-2 focus-visible:outline-accent">
            {body}
          </Link>
        ) : (
          <div key={t.label}>{body}</div>
        );
      })}
    </div>
  );
}

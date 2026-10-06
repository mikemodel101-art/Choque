/*
 * components/streak-heatmap.tsx — calm training consistency grid.
 * Why: section 6 asks for a private, optional streak that motivates without
 * gamified pressure. Twelve weeks of days rendered as soft cells (accent
 * intensity by sessions/day). It sits on the notebook only — the member's own
 * surface — and the copy deliberately contains no league tables or streak-shaming.
 */
"use client";

import { useMemo } from "react";
import type { NotebookEntry } from "@/lib/types";
import { WEEKDAYS_SHORT, cn } from "@/lib/utils";

const WEEKS = 16;
const DAYS = ["", "M", "", "W", "", "F", ""] as const;

export function StreakHeatmap({ entries }: { entries: NotebookEntry[] }) {
  const { grid, totals, max } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Week columns from oldest → newest, ending on this week.
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);

    const grid: { iso: string; count: number; future: boolean }[][] = [];
    let total = 0;
    let maxCount = 0;
    for (let w = 0; w < WEEKS; w++) {
      const col: { iso: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const count = counts.get(iso) ?? 0;
        total += count;
        maxCount = Math.max(maxCount, count);
        col.push({ iso, count, future: day > today });
      }
      grid.push(col);
    }
    return { grid, totals: total, max: maxCount };
  }, [entries]);

  return (
    <section aria-label="Training consistency over the last sixteen weeks" className="rounded-md border border-border bg-surface p-4 shadow-1">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Consistency</h2>
        <p className="text-xs text-muted">{totals} session{totals === 1 ? "" : "s"} logged, 16 weeks — private</p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div aria-hidden className="mr-1 grid shrink-0 grid-rows-7 gap-1">
          {DAYS.map((d, i) => (
            <span key={i} className="grid h-3 w-4 place-items-center text-right text-[9px] text-muted/70">{d}</span>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="grid shrink-0 grid-rows-7 gap-1">
            {week.map((day) => {
              const level = day.future || day.count === 0 ? 0 : Math.min(3, Math.ceil((day.count / Math.max(1, max)) * 3));
              return (
                <span
                  key={day.iso}
                  title={`${day.count > 0 ? `${day.count} session${day.count === 1 ? "" : "s"} · ` : "No session · "}${WEEKDAYS_SHORT[new Date(day.iso + "T12:00:00").getDay()]} ${day.iso}`}
                  aria-label={titleFor(day, max)}
                  className={cn(
                    "h-3 w-3 rounded-[3px] transition-colors",
                    day.future && "bg-transparent",
                    !day.future && level === 0 && "bg-foreground/[0.06]",
                    level === 1 && "bg-accent/25",
                    level === 2 && "bg-accent/55",
                    level === 3 && "bg-accent",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted">
        Less
        <span className="h-2.5 w-2.5 rounded-[3px] bg-foreground/[0.06]" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-accent/25" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-accent/55" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
        More · one tap per day trained — no streak pressure, just a mirror
      </p>
    </section>
  );

  function titleFor(day: { iso: string; count: number; future: boolean }, m: number) {
    void m;
    if (day.future) return `${day.iso} — upcoming`;
    return day.count > 0 ? `${day.iso} — ${day.count} logged` : `${day.iso} — rest day`;
  }
}

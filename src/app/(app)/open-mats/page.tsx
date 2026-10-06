/*
 * app/(app)/open-mats/page.tsx — open-mat finder with live RSVP.
 * Why: third pillar. A rolling two-week feed grouped by upcoming day, a
 * sticky filter bar whose refinement lives in a mobile bottom sheet, live
 * capacity meters, and one-tap RSVP persisting to localStorage. Card enters
 * use the shared stagger; day groups switch cleanly via AnimatePresence.
 */
"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { MatCard, MatCardSkeleton } from "@/components/cards";
import { DisciplineChips, FilterBar, PageHeader } from "@/components/filters";
import { AnimatedGrid, AnimatedItem, PageTransition } from "@/components/motion";
import { SubmitMatDialog } from "@/components/submit-dialogs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCities, useOpenMats, useToggleRsvp } from "@/lib/hooks";
import type { Discipline, OpenMatResolved } from "@/lib/types";
import { formatDate, formatDayLabel } from "@/lib/utils";

export default function OpenMatsPage() {
  const [tab, setTab] = useState("browse");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [city, setCity] = useState("all");
  const [level, setLevel] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);

  const [when, setWhen] = useState<"any" | "today" | "weekend">("any");

  const filters = useMemo(
    () => ({ discipline, city, level, freeOnly, mine: tab === "mine" }),
    [discipline, city, level, freeOnly, tab],
  );
  const { data: allMats, isLoading } = useOpenMats(filters);

  // "Today / This weekend" quick chips (spec 5.2) filter the resolved dates.
  const mats = useMemo(() => {
    const list = allMats ?? [];
    if (when === "any") return list;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (when === "today") return list.filter((m) => m.date === todayIso);
    return list.filter((m) => {
      const d = new Date(m.date + "T12:00:00");
      const dow = d.getDay();
      const within7 = (d.getTime() - today.getTime()) / 86_400_000 <= 7;
      return (dow === 0 || dow === 6) && within7;
    });
  }, [allMats, when]);
  const { data: myMats } = useOpenMats({ mine: true });
  const { data: cities } = useCities();
  const rsvp = useToggleRsvp();

  const grouped = useMemo(() => {
    const map = new Map<string, OpenMatResolved[]>();
    for (const m of mats ?? []) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    return [...map.entries()];
  }, [mats]);

  const activeFilters =
    (discipline !== "all" ? 1 : 0) + (city !== "all" ? 1 : 0) +
    (level !== "all" ? 1 : 0) + (freeOnly ? 1 : 0);

  const onRsvp = (id: string, going: boolean) =>
    rsvp.mutate(id, {
      onSuccess: () =>
        going
          ? toast.success("RSVP cancelled", { description: "Your spot has been released." })
          : toast.success("Spot reserved", { description: "See you on the mat." }),
    });

  const refinementControls = (
    <>
      <Select value={city} onValueChange={setCity}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Filter by city">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cities</SelectItem>
          {(cities ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={level} onValueChange={setLevel}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Filter by level">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any level</SelectItem>
          <SelectItem value="All levels">All levels</SelectItem>
          <SelectItem value="Beginner">Beginner</SelectItem>
          <SelectItem value="Competition">Competition</SelectItem>
        </SelectContent>
      </Select>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <Switch checked={freeOnly} onCheckedChange={setFreeOnly} />
        Free only
      </label>
    </>
  );

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Open mats"
          description="The next two weeks of community mats. Reserve a spot — capacity updates live."
          action={<SubmitMatDialog />}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Open mat views">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="mine">
              My schedule{myMats && myMats.length > 0 ? ` (${myMats.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <FilterBar
            className="mt-5"
            activeFilters={activeFilters + (when !== "any" ? 1 : 0)}
            sheetTitle="Refine open mats"
            quick={
              <div className="flex gap-1.5" role="group" aria-label="Quick date filters">
                {([
                  { id: "any", label: "All upcoming" },
                  { id: "today", label: "Today" },
                  { id: "weekend", label: "This weekend" },
                ] as const).map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setWhen(chip.id)}
                    aria-pressed={when === chip.id}
                    className={
                      "h-11 shrink-0 rounded-full border px-4 text-xs font-medium transition-all cursor-pointer active:scale-95 lg:h-9 " +
                      (when === chip.id
                        ? "border-accent bg-accent text-white shadow-1"
                        : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground")
                    }
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            }
            chips={<DisciplineChips value={discipline} onChange={setDiscipline} />}
            filters={refinementControls}
          />

          <TabsContent value={tab} className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <MatCardSkeleton key={i} />)}
              </div>
            ) : grouped.length > 0 ? (
              <div className="space-y-9">
                {grouped.map(([date, dayMats]) => (
                  <section key={date} aria-label={`Open mats on ${formatDate(date)}`}>
                    <h2 className="flex items-baseline gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                      <span className="text-accent">{formatDayLabel(date)}</span> {formatDate(date)}
                    </h2>
                    <AnimatedGrid id={`mats-${date}`} className="mt-3 grid gap-4 md:grid-cols-2">
                      {dayMats.map((m) => (
                        <AnimatedItem key={m.id} layoutKey={m.id}>
                          <MatCard
                            mat={m}
                            pending={rsvp.isPending && rsvp.variables === m.id}
                            onToggleRsvp={(id) => onRsvp(id, m.rsvped)}
                          />
                        </AnimatedItem>
                      ))}
                    </AnimatedGrid>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={tab === "mine" ? CalendarOff : CalendarCheck2}
                title={tab === "mine" ? "Nothing on your schedule" : "No open mats match"}
                description={
                  tab === "mine"
                    ? "Reserve a spot from the Browse tab and it will appear here."
                    : "Try another discipline or city — new mats are posted every week."
                }
                action={
                  tab === "mine" ? (
                    <Button variant="secondary" onClick={() => setTab("browse")}>Browse open mats</Button>
                  ) : undefined
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

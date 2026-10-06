/*
 * app/(app)/partners/page.tsx — training-partner directory.
 * Why: second pillar. Filter surface follows layout v2.3 (sticky bar + mobile
 * bottom sheet, desktop inline), results stagger in with AnimatePresence so
 * filter changes feel like re-dealing a hand of cards, never a hard swap.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { UserRoundSearch } from "lucide-react";
import { PartnerCard, PartnerCardSkeleton } from "@/components/cards";
import { DisciplineChips, FilterBar, PageHeader, SearchInput } from "@/components/filters";
import { AnimatedGrid, AnimatedItem, PageTransition } from "@/components/motion";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCities, usePartners } from "@/lib/hooks";
import type { Discipline } from "@/lib/types";

export default function PartnersPage() {
  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [time, setTime] = useState("all");
  const [weightClass, setWeightClass] = useState<"all" | "-65" | "65-75" | "75+">("all");
  const [lookingFor, setLookingFor] = useState("all");
  const [days, setDays] = useState<string[]>([]);
  const [partnerCity, setPartnerCity] = useState("all");

  const filters = useMemo(
    () => ({ q, discipline, time, weightClass, lookingFor }),
    [q, discipline, time, weightClass, lookingFor],
  );
  const { data: all, isLoading } = usePartners(filters);

  // Day-of-week chips narrow the result set client-side (spec 5.4).
  const { data: cities } = useCities();
  const partners = useMemo(() => {
    let out = all ?? [];
    if (days.length > 0) out = out.filter((p) => p.weekdays.some((d) => days.includes(d)));
    if (partnerCity !== "all") out = out.filter((p) => p.city === partnerCity);
    return out;
  }, [all, days, partnerCity]);

  useEffect(() => {
    if (isLoading || !partners) return;
    const t = setTimeout(() => {
      api.trackSearch("partners", {
        query: q, style: discipline === "all" ? "" : discipline, results: partners.length,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [isLoading, partners, q, discipline]);

  const activeFilters =
    (discipline !== "all" ? 1 : 0) + (time !== "all" ? 1 : 0) +
    (weightClass !== "all" ? 1 : 0) + (lookingFor !== "all" ? 1 : 0) + (days.length > 0 ? 1 : 0) +
    (partnerCity !== "all" ? 1 : 0);

  const reset = () => {
    setQ(""); setDiscipline("all"); setTime("all"); setWeightClass("all"); setLookingFor("all"); setDays([]); setPartnerCity("all");
  };

  const refinementControls = (
    <>
      <Select value={time} onValueChange={setTime}>
        <SelectTrigger className="w-full lg:w-32" aria-label="Filter by time of day">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any time</SelectItem>
          <SelectItem value="Morning">Mornings</SelectItem>
          <SelectItem value="Midday">Midday</SelectItem>
          <SelectItem value="Evening">Evenings</SelectItem>
        </SelectContent>
      </Select>
      <Select value={weightClass} onValueChange={(v) => setWeightClass(v as typeof weightClass)}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Filter by weight class">
          <SelectValue placeholder="Weight" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any weight</SelectItem>
          <SelectItem value="-65">Under 65 kg</SelectItem>
          <SelectItem value="65-75">65–75 kg</SelectItem>
          <SelectItem value="75+">Over 75 kg</SelectItem>
        </SelectContent>
      </Select>
      <Select value={partnerCity} onValueChange={setPartnerCity}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Filter by city or area">
          <SelectValue placeholder="City / area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any area</SelectItem>
          {(cities ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="w-full">
        <span className="mb-1.5 block text-xs font-medium text-muted">Days they train</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by day of week">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                onClick={() => setDays((cur) => on ? cur.filter((x) => x !== d) : [...cur, d])}
                aria-pressed={on}
                className={
                  "h-9 w-11 rounded-full border text-xs font-medium transition-all active:scale-95 " +
                  (on ? "border-accent bg-accent text-white shadow-1"
                      : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground")
                }
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <Select value={lookingFor} onValueChange={setLookingFor}>
        <SelectTrigger className="w-full lg:w-40" aria-label="Filter by intent">
          <SelectValue placeholder="Looking for" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any intent</SelectItem>
          <SelectItem value="Open mat">Open mat</SelectItem>
          <SelectItem value="Drilling">Drilling</SelectItem>
          <SelectItem value="Comp prep">Comp prep</SelectItem>
          <SelectItem value="Beginner friendly">Beginner friendly</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Find a training partner"
          description="Search by area, style and availability. Cards show only what each person chose to share — exact locations are never displayed."
        />

        <FilterBar
          activeFilters={activeFilters}
          sheetTitle="Refine partners"
          quick={
            <SearchInput value={q} onChange={setQ} placeholder="Search by name, city, or focus…" label="Search partners" />
          }
          chips={<DisciplineChips value={discipline} onChange={setDiscipline} />}
          filters={refinementControls}
        />

        <p className="text-sm text-muted" aria-live="polite">
          {isLoading ? "Finding partners…" : `${partners?.length ?? 0} ${partners?.length === 1 ? "practitioner" : "practitioners"} available`}
        </p>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <PartnerCardSkeleton key={i} />)}
          </div>
        ) : partners && partners.length > 0 ? (
          <AnimatedGrid id="partners-grid" className="grid gap-4 sm:grid-cols-2">
            {partners.map((p) => (
              <AnimatedItem key={p.id} layoutKey={p.id}>
                <PartnerCard partner={p} />
              </AnimatedItem>
            ))}
          </AnimatedGrid>
        ) : (
          <EmptyState
            icon={UserRoundSearch}
            title="Nobody matches — yet"
            description="Loosen one filter to see more practitioners, or check back after this weekend's open mats."
            action={<Button variant="secondary" onClick={reset}>Clear all filters</Button>}
          />
        )}
      </div>
    </PageTransition>
  );
}

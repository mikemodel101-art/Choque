/*
 * app/(app)/gyms/page.tsx — gym directory (spec 5.1).
 * Why: search + filters (city, neighborhood, style, "open mat available",
 * "drop-ins welcome"), results as cards with a "Load more" pager, and a
 * Leaflet/OSM map toggle where selecting a pin highlights the matching card
 * (and vice-versa). Filter refinement happens in a bottom sheet on mobile.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import dynamic from "next/dynamic";
import { Building2, LayoutList, Map as MapIcon } from "lucide-react";
import { GymCard, GymCardSkeleton } from "@/components/cards";
import { DisciplineChips, FilterBar, PageHeader, SearchInput, Segmented } from "@/components/filters";
import { SubmitGymDialog } from "@/components/submit-dialogs";
import { WaitlistButton } from "@/components/waitlist";
import { AnimatedGrid, AnimatedItem, CrossFade, PageTransition } from "@/components/motion";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NEIGHBORHOOD_LIST } from "@/lib/data";
import { useCities, useGyms, useSavedGyms, useToggleSavedGym } from "@/lib/hooks";
import type { Discipline } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Leaflet touches `window`, so the map is client-only. */
const GymMap = dynamic(() => import("@/components/gym-map").then((m) => m.GymMap), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-md border border-border bg-foreground/[0.04]" />,
});

const PAGE_SIZE = 6;

export default function GymsPage() {
  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [city, setCity] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [openMatOnly, setOpenMatOnly] = useState(false);
  const [dropInsOnly, setDropInsOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"rating" | "price" | "name">("rating");
  const [view, setView] = useState<"list" | "map">("list");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({ q, discipline, city, neighborhood, openMatOnly, dropInsOnly, verifiedOnly, sort }),
    [q, discipline, city, neighborhood, openMatOnly, dropInsOnly, verifiedOnly, sort],
  );
  const { data: gyms, isLoading } = useGyms(filters);
  const { data: cities } = useCities();
  const { data: savedIds } = useSavedGyms();
  const toggleSave = useToggleSavedGym();

  // Reset the pager whenever the result set changes.
  useEffect(() => setVisible(PAGE_SIZE), [filters]);

  // Analytics 5.7: record each settled search with its result count so the
  // admin dashboard can surface zero-result queries (where to add gyms next).
  useEffect(() => {
    if (isLoading || !gyms) return;
    const t = setTimeout(() => {
      api.trackSearch("gyms", {
        query: q, city: city === "all" ? "" : city,
        style: discipline === "all" ? "" : discipline, results: gyms.length,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [isLoading, gyms, q, city, discipline]);

  const activeFilters =
    (city !== "all" ? 1 : 0) + (neighborhood !== "all" ? 1 : 0) + (discipline !== "all" ? 1 : 0) +
    (openMatOnly ? 1 : 0) + (dropInsOnly ? 1 : 0) + (verifiedOnly ? 1 : 0) + (sort !== "rating" ? 1 : 0);

  const reset = () => {
    setQ(""); setDiscipline("all"); setCity("all"); setNeighborhood("all");
    setOpenMatOnly(false); setDropInsOnly(false); setVerifiedOnly(false); setSort("rating");
  };

  const shown = (gyms ?? []).slice(0, visible);
  const hasMore = (gyms ?? []).length > visible;

  const refinementControls = (
    <>
      <Select value={city} onValueChange={setCity}>
        <SelectTrigger className="w-full lg:w-32" aria-label="Filter by city">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cities</SelectItem>
          {(cities ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={neighborhood} onValueChange={setNeighborhood}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Filter by neighborhood">
          <SelectValue placeholder="Neighborhood" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any area</SelectItem>
          {NEIGHBORHOOD_LIST.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
        <SelectTrigger className="w-full lg:w-32" aria-label="Sort gyms">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rating">Top rated</SelectItem>
          <SelectItem value="price">Lowest price</SelectItem>
          <SelectItem value="name">Name A–Z</SelectItem>
        </SelectContent>
      </Select>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <Switch checked={openMatOnly} onCheckedChange={setOpenMatOnly} />
        Open mat available
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <Switch checked={dropInsOnly} onCheckedChange={setDropInsOnly} />
        Drop-ins welcome
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        Verified only
      </label>
    </>
  );

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Find a gym"
          description="Partner academies and community favorites, with honest drop-in fees and real weekly schedules."
          action={<SubmitGymDialog />}
        />

        <FilterBar
          activeFilters={activeFilters}
          sheetTitle="Refine academies"
          quick={
            <SearchInput value={q} onChange={setQ} placeholder="Search name, area, or coach…" label="Search gyms" />
          }
          chips={<DisciplineChips value={discipline} onChange={setDiscipline} />}
          filters={refinementControls}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {isLoading ? "Searching academies…" : `${gyms?.length ?? 0} ${gyms?.length === 1 ? "academy" : "academies"}`}
          </p>
          <Segmented
            options={[
              { value: "list", label: "List", icon: LayoutList },
              { value: "map", label: "Map", icon: MapIcon },
            ]}
            value={view}
            onChange={setView}
            label="Change view"
            className="w-44"
          />
        </div>

        <CrossFade stateKey={view}>
          {view === "map" && gyms && gyms.length > 0 ? (
            <div className="space-y-4">
              <GymMap gyms={gyms} selectedId={selectedId} onSelect={setSelectedId} />
              {selectedId && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gyms.filter((g) => g.id === selectedId).map((g) => (
                    <div key={g.id} className="rounded-md ring-2 ring-accent/40">
                      <GymCard gym={g} saved={savedIds?.includes(g.id)} onToggleSave={(id) => toggleSave.mutate(id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <GymCardSkeleton key={i} />)}
            </div>
          ) : gyms && gyms.length > 0 ? (
            <div className="space-y-6">
              <AnimatedGrid id="gyms-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((g) => (
                  <AnimatedItem key={g.id} layoutKey={g.id}>
                    <div
                      onMouseEnter={() => setSelectedId(g.id)}
                      onMouseLeave={() => setSelectedId(null)}
                      className={cn("rounded-md transition-shadow", selectedId === g.id && "ring-2 ring-accent/35")}
                    >
                      <GymCard
                        gym={g}
                        saved={savedIds?.includes(g.id)}
                        onToggleSave={(id) => toggleSave.mutate(id)}
                      />
                    </div>
                  </AnimatedItem>
                ))}
              </AnimatedGrid>
              {hasMore && (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Load more ({(gyms?.length ?? 0) - visible} left)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No academies match"
              description="Try a different discipline, clear the area filter, or search a coach's name."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={reset}>Clear all filters</Button>
                  <WaitlistButton city={city !== "all" ? city : undefined} />
                </div>
              }
            />
          )}
        </CrossFade>
      </div>
    </PageTransition>
  );
}

/*
 * app/(app)/travel/page.tsx — "Traveling?" mode.
 * Why: the #1 use case for visitors — answer three questions fast: which gyms
 * welcome drop-ins in the city, what visitor policy applies, and which open
 * mats land inside the trip window. The whole plan lives in the URL, so the
 * member can copy a link and share the exact same trip view with others (and
 * the destination-less empty state offers the city waitlist).
 */
"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarRange, Link2, Plane, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { GYMS } from "@/lib/data";
import { useCities, useOpenMats } from "@/lib/hooks";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { GymCard, MatCard } from "@/components/cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { WaitlistButton } from "@/components/waitlist";
import { formatDate } from "@/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function within(iso: string, from: string, to: string) {
  return iso >= from && iso <= to;
}

function TravelInner() {
  const params = useSearchParams();
  const [city, setCity] = useState(params.get("city") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? plusDays(1));
  const [to, setTo] = useState(params.get("to") ?? plusDays(7));

  const { data: cities } = useCities();
  const { data: mats } = useOpenMats({});

  const gymsHere = useMemo(
    () => (city ? GYMS.filter((g) => g.city === city) : []),
    [city],
  );
  const matsInWindow = useMemo(
    () =>
      (mats ?? []).filter(
        (m) => m.gym.city === city && within(m.date, from, to),
      ),
    [mats, city, from, to],
  );
  const visitorsWelcome = gymsHere.filter((g) => g.visitorFriendly);

  const share = async () => {
    const url = `${window.location.origin}/travel?city=${encodeURIComponent(city)}&from=${from}&to=${to}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Trip link copied", { description: "Share it — anyone with the link sees this same plan." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traveling?"
        description="Pick a city and your dates — see which mats and drop-ins line up with the trip."
      />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div>
            <label htmlFor="trip-city" className="mb-1.5 block text-sm font-medium">Destination</label>
            <select
              id="trip-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10"
            >
              <option value="">Choose a city…</option>
              {(cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="trip-from" className="mb-1.5 block text-sm font-medium">Arrive</label>
            <input
              id="trip-from" type="date" value={from} min={todayIso()} max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10"
            />
          </div>
          <div>
            <label htmlFor="trip-to" className="mb-1.5 block text-sm font-medium">Leave</label>
            <input
              id="trip-to" type="date" value={to} min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10"
            />
          </div>
          <Button variant="secondary" onClick={share} disabled={!city}>
            <Link2 className="size-4" /> Share trip
          </Button>
        </div>
      </Card>

      {!city ? (
        <EmptyState
          icon={Plane}
          title="Where are you headed?"
          description="Choose a destination above to build a training itinerary. If your city isn't covered yet, join its waitlist below."
          action={<WaitlistButton />}
        />
      ) : (
        <div className="space-y-8">
          {/* Quick numbers */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "drop-in friendly", value: visitorsWelcome.length },
              { icon: CalendarRange, label: "open mats in window", value: matsInWindow.length },
              { icon: ShieldCheck, label: "visitor-friendly badged", value: visitorsWelcome.length },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <s.icon className="size-3.5 text-accent" /> {s.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Open mats inside the trip window */}
          <section aria-label="Open mats during your trip">
            <h2 className="flex items-baseline gap-2 text-lg font-semibold tracking-tight">
              Open mats in {city}
              <span className="text-sm font-normal text-muted">
                {formatDate(from)} → {formatDate(to)}
              </span>
            </h2>
            {matsInWindow.length === 0 ? (
              <EmptyState
                className="mt-3"
                icon={CalendarRange}
                title="Nothing lands in that window"
                description="Widen the dates — most mats run on weekends — or check the gyms below for their weekly schedule."
              />
            ) : (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {matsInWindow.map((m) => <MatCard key={m.id} mat={m} />)}
              </div>
            )}
          </section>

          {/* Gyms with visitor policies */}
          <section aria-label="Gyms with clear visitor policies">
            <h2 className="text-lg font-semibold tracking-tight">
              Visitor-friendly gyms <Badge variant="accent">drop-ins welcome</Badge>
            </h2>
            {visitorsWelcome.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No gyms carry the visitor-friendly badge here yet — but every gym below lists its drop-in policy.</p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visitorsWelcome.map((g) => <GymCard key={g.id} gym={g} />)}
              </div>
            )}

            {gymsHere.length > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-foreground">
                  Show every academy in {city} ({gymsHere.length})
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gymsHere.map((g) => <GymCard key={g.id} gym={g} />)}
                </div>
              </details>
            )}
          </section>

          <p className="text-xs text-muted">
            Always confirm with the academy before you travel — drop-in policies change.
            Planning somewhere else? <Link href="/gyms" className="text-accent underline-offset-4 hover:underline">Search the directory</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TravelPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-foreground/[0.04]" />}>
        <TravelInner />
      </Suspense>
    </PageTransition>
  );
}

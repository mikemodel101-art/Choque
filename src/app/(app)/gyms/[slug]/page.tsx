/*
 * app/(app)/gyms/[slug]/page.tsx — academy detail.
 * Why: the full picture on one screen — photography, about, pricing, coaches,
 * the weekly schedule, and the academy's upcoming open mats with one-tap RSVP.
 * Saving and directions are real actions (localStorage + maps link), keeping
 * the zero-dead-button promise.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Baby,
  Bookmark,
  Dumbbell,
  ExternalLink,
  MapPin,
  ShowerHead,
  Star,
  Venus,
} from "lucide-react";
import { MatCard, MatCardSkeleton } from "@/components/cards";
import { GymActions, GymJsonLd } from "@/components/gym-actions";
import { PageTransition } from "@/components/motion";
import { gymMetadata } from "./og-metadata";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useGym, useOpenMats, useSavedGyms, useToggleRsvp, useToggleSavedGym } from "@/lib/hooks";
import { disciplineLabel, disciplineShort } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarOff } from "lucide-react";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AmenityIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes("shower")) return <ShowerHead className="size-3.5" />;
  if (l.includes("strength") || l.includes("condition")) return <Dumbbell className="size-3.5" />;
  return null;
}

export default function GymDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: gym, isLoading } = useGym(slug);
  const { data: mats, isLoading: matsLoading } = useOpenMats({});
  const { data: savedIds } = useSavedGyms();
  const toggleSave = useToggleSavedGym();
  const rsvp = useToggleRsvp();

  if (isLoading) return <GymDetailSkeleton />;

  if (!gym) {
    return (
      <EmptyState
        icon={MapPin}
        title="Academy not found"
        description="This gym may have been removed from the directory."
        action={<Link href="/gyms"><Button variant="secondary">Back to all gyms</Button></Link>}
      />
    );
  }

  const saved = savedIds?.includes(gym.id) ?? false;
  const gymMats = (mats ?? []).filter((m) => m.gymId === gym.id);
  const days = [...new Set(gym.schedule.map((s) => s.day))].sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
  );
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address)}`;

  // Keep the document head (and thence the unfurled share card) in sync.
  if (typeof document !== "undefined") {
    const md = gymMetadata(gym);
    document.title = String(md.title);
    let d = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!d) { d = document.createElement("meta"); d.name = "description"; document.head.appendChild(d); }
    d.content = String(md.description ?? "");
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <GymJsonLd gym={gym} />
      <Link href="/gyms" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> All gyms
      </Link>

      {/* Banner */}
      <div className="relative aspect-[21/9] overflow-hidden rounded-md shadow-1">
        <Image src={gym.image} alt={`Training floor at ${gym.name}`} fill priority sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" />
        <button
          onClick={() => toggleSave.mutate(gym.id)}
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${gym.name}` : `Save ${gym.name}`}
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow-1 backdrop-blur transition-all hover:scale-105 active:scale-95 dark:bg-stone-900/85 dark:text-stone-100"
        >
          <Bookmark className={cn("size-[18px]", saved && "fill-accent text-accent")} />
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
            {gym.name}
            {gym.verified && <BadgeCheck className="size-6 text-accent" aria-label="Verified academy" />}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {gym.neighborhood ? `${gym.neighborhood} · ` : ""}{gym.address}
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-4 fill-warning text-warning" /> {gym.rating.toFixed(1)}
              <span className="font-normal text-muted">({gym.reviews} reviews)</span>
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gym.disciplines.map((d) => <Badge key={d} variant="accent">{disciplineLabel(d)}</Badge>)}
            {gym.affiliate && <Badge variant="neutral">Shoyoroll partner</Badge>}
            {gym.womenOnly && <Badge variant="muted"><Venus /> Women&apos;s classes</Badge>}
            {gym.kids && <Badge variant="muted"><Baby /> Kids program</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={saved ? "secondary" : "soft"}
            loading={toggleSave.isPending}
            onClick={() => toggleSave.mutate(gym.id)}
          >
            <Bookmark className={cn("size-4", saved && "fill-current")} />
            {saved ? "Saved" : "Save gym"}
          </Button>
          <a href={directionsUrl} target="_blank" rel="noreferrer">
            <Button variant="primary">
              Directions <ExternalLink className="size-4" />
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted measure">{gym.about}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {gym.amenities.map((a) => (
                <Badge key={a} variant="outline"><AmenityIcon label={a} /> {a}</Badge>
              ))}
            </div>
          </Card>

          {/* Visitor information — what a drop-in needs to know before arriving */}
          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Visitor information</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted">Drop-ins</dt>
                <dd>{gym.dropInsWelcome ? `Welcome — $${gym.dropIn} per session` : "By arrangement only"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted">Open mats</dt>
                <dd>{gym.hasOpenMat ? "Yes — see the schedule below" : "None currently listed"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted">Good to bring</dt>
                <dd>{gym.disciplines.includes("bjj") ? "Gi (any colour), mouthguard, flip-flops" : "Shorts, rashguard, mouthguard"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted">First visit</dt>
                <dd>Arrive 15 minutes early to sign the waiver and meet {gym.headCoach}.</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <GymActions gym={gym} />
              <p className="mt-3 text-xs text-muted">
                Planning a trip to {gym.city}?{" "}
                <Link href={`/travel?city=${encodeURIComponent(gym.city)}`} className="text-accent underline-offset-4 hover:underline">
                  Open traveling mode
                </Link>
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Coaching staff</h2>
            <ul className="mt-3 divide-y divide-border">
              {gym.coaches.map((c, i) => (
                <li key={c} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{c}</span>
                  <span className="text-xs text-muted">{i === 0 ? "Head coach" : "Coach"}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Weekly schedule</h2>
            <div className="mt-3 space-y-4">
              {days.map((day) => (
                <div key={day}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{day}</p>
                  <ul className="mt-1.5 divide-y divide-border rounded-sm border border-border">
                    {gym.schedule
                      .filter((s) => s.day === day)
                      .map((s) => (
                        <li key={s.time + s.label} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", s.openMat && "bg-accent-soft/50")}>
                          <span className="w-12 shrink-0 font-mono text-xs text-muted">{s.time}</span>
                          <span className="flex-1 font-medium">{s.label}</span>
                          <Badge variant={s.openMat ? "accent" : "muted"}>{s.openMat ? "Open mat" : disciplineShort(s.discipline)}</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {/* Gallery */}
          <div className="grid gap-4 sm:grid-cols-3">
            {gym.gallery.map((src, i) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-md shadow-1">
                <Image src={src} alt={`${gym.name} gallery photo ${i + 1}`} fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover transition-transform duration-500 hover:scale-[1.03]" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Good to know</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Membership</dt>
                <dd className="font-medium">from ${gym.priceFrom}/mo</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Drop-in</dt>
                <dd className="font-medium">${gym.dropIn}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Head coach</dt>
                <dd className="text-right font-medium">{gym.headCoach}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Location</dt>
                <dd className="text-right font-medium">{gym.city}, {gym.state}</dd>
              </div>
            </dl>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Open mats here</h2>
            <div className="space-y-3">
              {matsLoading ? (
                <><MatCardSkeleton /><MatCardSkeleton /></>
              ) : gymMats.length > 0 ? (
                gymMats.map((m) => (
                  <MatCard
                    key={m.id}
                    mat={m}
                    compact
                    pending={rsvp.isPending && rsvp.variables === m.id}
                    onToggleRsvp={(id) => rsvp.mutate(id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={CalendarOff}
                  title="No open mats scheduled"
                  description="This academy hasn't posted an open mat in the next two weeks."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}

function GymDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="aspect-[21/9] w-full rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="flex gap-1.5"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-24 rounded-full" /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}

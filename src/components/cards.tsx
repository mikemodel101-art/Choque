/*
 * components/cards.tsx — shared entity cards (gym, partner, open mat).
 * Why: the same domain objects appear on the landing preview, directory lists,
 * and profile pages. One card implementation per entity guarantees identical
 * information hierarchy everywhere, and each card exposes skeleton + compact
 * variants so loading and inline states look designed, not bolted on.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  Clock,
  MapPin,
  Star,
  Users,
  Venus,
} from "lucide-react";
import { toast } from "sonner";
import { downloadIcs } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import type { Gym, OpenMatResolved, Partner } from "@/lib/types";
import { disciplineShort } from "@/lib/types";
import { cn, formatDayLabel } from "@/lib/utils";

/* Host + visitor requirements live on the mat card per spec 5.2. */

/* ————————————————— Gym card ————————————————— */
export function GymCard({
  gym,
  saved,
  onToggleSave,
}: {
  gym: Gym;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-md border border-border bg-surface shadow-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2">
      <Link href={`/gyms/${gym.slug}`} className="block focus-visible:outline-accent" aria-label={`${gym.name}, ${gym.city}`}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={gym.image}
            alt={`Training inside ${gym.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          {gym.affiliate && (
            <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-900 backdrop-blur">
              Shoyoroll partner
            </span>
          )}
        </div>
      </Link>
      {onToggleSave && (
        <button
          onClick={() => onToggleSave(gym.id)}
          aria-label={saved ? `Unsave ${gym.name}` : `Save ${gym.name}`}
          aria-pressed={saved}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow-1 backdrop-blur transition-all hover:scale-105 active:scale-95 dark:bg-stone-900/85 dark:text-stone-100"
        >
          <Bookmark className={cn("size-4", saved && "fill-accent text-accent")} />
        </button>
      )}
      <Link href={`/gyms/${gym.slug}`} className="block p-4 focus-visible:outline-accent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-base font-semibold tracking-tight">
              <span className="truncate">{gym.name}</span>
              {gym.verified && <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Verified academy" />}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5" /> {gym.city}, {gym.state}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-xs font-semibold">
            <Star className="size-3 fill-warning text-warning" /> {gym.rating.toFixed(1)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gym.disciplines.map((d) => (
            <Badge key={d} variant="muted">{disciplineShort(d)}</Badge>
          ))}
          {gym.womenOnly && <Badge variant="accent"><Venus /> Women&apos;s classes</Badge>}
          {gym.visitorFriendly && (
            <Badge variant="accent" title="Admin-verified drop-in policy">
              Visitor friendly
            </Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          From <span className="font-medium text-foreground">${gym.priceFrom}/mo</span>
          <span className="mx-1.5 text-border">·</span>
          ${gym.dropIn} drop-in
        </p>
      </Link>
    </article>
  );
}

export function GymCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-1">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-1.5"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/* ————————————————— Partner card ————————————————— */
export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group block rounded-md border border-border bg-surface p-5 shadow-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2 focus-visible:outline-accent"
      aria-label={`${partner.name}, ${partner.rank}`}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={partner.name} beltColor={partner.beltColor} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
            <span className="truncate">{partner.name}</span>
            {partner.verified && <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Verified member" />}
          </h3>
          <p className="truncate text-sm text-muted">
            {partner.rank} · {partner.weightKg} kg
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <span className={cn("size-1.5 rounded-full", partner.lastActiveDays === 0 ? "bg-success" : "bg-foreground/25")} />
            {partner.lastActiveDays === 0 ? "Active today" : `Active ${partner.lastActiveDays}d ago`}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted">{partner.bio}</p>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        {partner.lookingFor.map((l) => (
          <Badge key={l} variant="accent">{l}</Badge>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted">
          <Clock className="size-3.5" /> {partner.availability.join(" · ")}
        </span>
      </div>
    </Link>
  );
}

export function PartnerCardSkeleton() {
  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-1">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  );
}

/* ————————————————— Open-mat card ————————————————— */
export function MatCard({
  mat,
  pending,
  onToggleRsvp,
  compact,
}: {
  mat: OpenMatResolved;
  pending?: boolean;
  onToggleRsvp?: (id: string) => void;
  compact?: boolean;
}) {
  const pct = Math.min(100, Math.round((mat.attendees / mat.capacity) * 100));
  const isFull = mat.full && !mat.rsvped;
  return (
    <article className="rounded-md border border-border bg-surface p-5 shadow-1 transition-shadow hover:shadow-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <CalendarDays className="size-3.5" /> {formatDayLabel(mat.date)}, {mat.date.slice(5).replace("-", "/")}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold tracking-tight">{mat.title}</h3>
          <Link href={`/gyms/${mat.gym.slug}`} className="mt-0.5 block truncate text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
            {mat.gym.name} · {mat.gym.city}
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={mat.level === "Competition" ? "warning" : "muted"}>{mat.level}</Badge>
          <Badge variant="muted">{disciplineShort(mat.discipline)}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1.5"><Clock className="size-4" /> {mat.start}–{mat.end}</span>
        <span className="flex items-center gap-1.5"><Users className="size-4" /> {mat.attendees}/{mat.capacity}</span>
        <span className={cn("font-medium", mat.fee === 0 ? "text-success" : "text-foreground")}>
          {mat.fee === 0 ? "Free" : `$${mat.fee}`}
        </span>
        {mat.womenOnly && <Badge variant="accent"><Venus /> Women only</Badge>}
      </div>

      {!compact && <p className="mt-3 text-sm text-muted measure line-clamp-2">{mat.notes}</p>}

      {/* Host + visitor requirements (spec: clear host info & requirements) */}
      <div className="mt-3 grid gap-1.5 text-xs text-muted sm:grid-cols-2">
        <p className="flex items-center gap-1.5 truncate">
          <Users className="size-3.5 shrink-0" />
          Host: <span className="truncate font-medium text-foreground">{mat.hostName}</span>
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <BadgeCheck className="size-3.5 shrink-0" />
          <span className="truncate">{mat.visitorRequirements}</span>
        </p>
      </div>

      <div className="mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.07]" role="progressbar" aria-valuenow={mat.attendees} aria-valuemin={0} aria-valuemax={mat.capacity} aria-label={`${mat.attendees} of ${mat.capacity} spots taken`}>
          <div
            className={cn("h-full rounded-full transition-all duration-500", pct >= 85 ? "bg-accent" : "bg-foreground/50")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {mat.full ? "At capacity — check back soon" : `${mat.capacity - mat.attendees} spots left`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                downloadIcs({
                  uid: mat.id,
                  title: `${mat.title} — ${mat.gym.name}`,
                  description: `${mat.level} · ${mat.fee === 0 ? "Free" : `$${mat.fee}`}. ${mat.notes}`,
                  location: `${mat.gym.name}, ${mat.gym.address}`,
                  date: mat.date,
                  start: mat.start,
                  end: mat.end,
                });
                toast.success("Calendar file downloaded");
              }}
              aria-label={`Add ${mat.title} to your calendar`}
            >
              <CalendarPlus className="size-4" /> Add to calendar
            </Button>
            {onToggleRsvp && (
              <Button
                size="sm"
                variant={mat.rsvped ? "secondary" : "primary"}
                loading={pending}
                disabled={isFull}
                onClick={() => onToggleRsvp(mat.id)}
              >
                {mat.rsvped ? "Going · cancel" : isFull ? "Full" : "Reserve a spot"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function MatCardSkeleton() {
  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-1">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-2 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-4 h-1 w-full rounded-full" />
    </div>
  );
}

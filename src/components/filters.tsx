/*
 * components/filters.tsx — shared filter bar primitives.
 * Why: the directory pages (gyms, partners, open mats) all combine a page
 * header, a search field, and single-select discipline chips. These primitives
 * give those pages identical affordances and keyboard behavior.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DISCIPLINES, type Discipline } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <label htmlFor="search-field" className="sr-only">{label}</label>
      <input
        id="search-field"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm shadow-1 placeholder:text-muted/80 transition-colors duration-150 hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-10"
      />
    </div>
  );
}

export function DisciplineChips({
  value,
  onChange,
  includeAll = true,
}: {
  value: Discipline | "all";
  onChange: (v: Discipline | "all") => void;
  includeAll?: boolean;
}) {
  const options: (Discipline | "all")[] = includeAll
    ? ["all", ...DISCIPLINES.map((d) => d.id)]
    : DISCIPLINES.map((d) => d.id);
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar lg:flex-wrap" role="group" aria-label="Filter by discipline">
      {options.map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              "h-11 lg:h-8 shrink-0 rounded-full border px-4 lg:px-3 text-xs font-medium transition-all cursor-pointer active:scale-95",
              active
                ? "border-accent bg-accent text-white shadow-1"
                : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground",
            )}
          >
            {id === "all" ? "All" : DISCIPLINES.find((d) => d.id === id)?.short}
          </button>
        );
      })}
    </div>
  );
}

/**
 * FilterBar — sticky on mobile with a bottom-sheet for refinement; the same
 * controls render inline on desktop. `quick` = the always-visible row
 * (search), `chips` = discipline row, `filters` = selects/switches (drawer
 * on mobile, inline on lg). `activeFilters` shows a count badge.
 */
export function FilterBar({
  quick,
  chips,
  filters,
  activeFilters = 0,
  sheetTitle = "Refine results",
  className,
}: {
  quick?: ReactNode;
  chips?: ReactNode;
  filters: ReactNode;
  activeFilters?: number;
  sheetTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "sticky top-14 z-20 -mx-4 border-b border-border/70 bg-background/92 px-4 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6",
        "lg:static lg:mx-0 lg:rounded-md lg:border lg:border-border lg:bg-surface lg:p-4 lg:shadow-1",
        className,
      )}
    >
      <div className="space-y-3 pt-3 lg:pt-0">
        {/* Row 1: quick row + mobile filter button */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{quick}</div>
          <Drawer open={open} onOpenChange={setOpen}>
            <Button
              variant="secondary"
              className="relative shrink-0 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={`Open filters, ${activeFilters} active`}
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilters > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-1">
                  {activeFilters}
                </span>
              )}
            </Button>
            <DrawerContent title={sheetTitle} description="Apply narrower filters — results update live.">
              <div className="flex flex-col gap-4 pt-2">{filters}</div>
              <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
                Show results
              </Button>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Row 2: chips + inline filters (desktop) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {chips}
          <div className="hidden items-center gap-3 lg:ml-auto lg:flex">{filters}</div>
        </div>
      </div>
    </div>
  );
}

/** Horizontal segmented control using the sliding-pill pattern. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label?: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-sm border border-border bg-surface p-1 shadow-1", className)} role="tablist" aria-label={label}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors cursor-pointer",
              active ? "text-accent" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-0 rounded-sm bg-accent-soft" aria-hidden />
            )}
            {opt.icon && <opt.icon className="relative size-4" aria-hidden />}
            <span className="relative">{opt.label ?? String(opt.value)}</span>
          </button>
        );
      })}
    </div>
  );
}

/*
 * components/command-palette.tsx — global ⌘K command palette.
 * Why: power users triage fast. One keystroke opens a fuzzy-driven palette
 * with pages, cities, academies and common actions (new note, open mats,
 * travel planner). Fully keyboard navigable (arrows/enter/esc), respects the
 * staff-only surfaces via useRole, and sources destinations from the real
 * directory data — never a hard-coded shortcut that can rot.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, CalendarCheck2, FileText, Home, Inbox, MapPin, NotebookPen,
  Plane, Search, Settings2, ShieldCheck, UserRound, Users, Map,
} from "lucide-react";
import { GYMS } from "@/lib/data";
import { useRole } from "@/components/can";
import { EASE_OUT, useMotionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords: string;
  group: "Pages" | "Actions" | "Cities" | "Gyms";
}

export function CommandPalette() {
  const router = useRouter();
  const role = useRole();
  const enabled = useMotionEnabled();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      { id: "home", label: "Home", icon: Home, href: "/", keywords: "landing marketing", group: "Pages" },
      { id: "gyms", label: "Find a gym", icon: Building2, href: "/gyms", keywords: "directory academies", group: "Pages" },
      { id: "mats", label: "Open mats", icon: CalendarCheck2, href: "/open-mats", keywords: "schedule rsvp", group: "Pages" },
      { id: "partners", label: "Training partners", icon: Users, href: "/partners", keywords: "people roll drill", group: "Pages" },
      { id: "requests", label: "Requests inbox", icon: Inbox, href: "/requests", keywords: "connections accept decline", group: "Pages" },
      { id: "notebook", label: "Notebook", icon: NotebookPen, href: "/notebook", keywords: "notes journal log", group: "Pages" },
      { id: "profile", label: "Profile & settings", icon: UserRound, href: "/profile", keywords: "account privacy avatar", group: "Pages" },
      { id: "admin", label: "Admin tools", icon: ShieldCheck, href: "/admin", keywords: "moderation queue staff", group: "Pages" },
      { id: "new-note", label: "New notebook entry", icon: FileText, href: "/notebook", keywords: "create log session", group: "Actions" },
      { id: "travel", label: "Traveling? Plan a trip", icon: Plane, href: "/travel", keywords: "trip destination visiting", group: "Actions" },
      { id: "map", label: "Gym map", icon: Map, href: "/gyms?view=map", keywords: "locations leaflet", group: "Actions" },
      { id: "settings", label: "Account & security", icon: Settings2, href: "/profile", keywords: "password email", group: "Actions" },
      ...[...new Set(GYMS.map((g) => g.city))].map((city) => ({
        id: `city-${city}`, label: city, hint: "browse gyms",
        icon: MapPin, href: `/gyms?q=${encodeURIComponent(city)}`,
        keywords: `city ${city.toLowerCase()}`, group: "Cities" as const,
      })),
      ...GYMS.map((g) => ({
        id: `gym-${g.id}`, label: g.name, hint: `${g.neighborhood ?? g.city}, ${g.state}`,
        icon: Building2, href: `/gyms/${g.slug}`,
        keywords: `gym academy ${g.name.toLowerCase()} ${g.city.toLowerCase()} ${g.headCoach.toLowerCase()}`,
        group: "Gyms" as const,
      })),
    ];
    return role.isStaff ? base : base.filter((i) => i.id !== "admin");
  }, [role.isStaff]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || i.keywords.includes(q) || (i.hint ?? "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [items, query]);

  /* ⌘K / Ctrl+K opens; Esc closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* Keep the active row in view */
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter" && results[cursor]) { e.preventDefault(); go(results[cursor].href); }
  }

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[16dvh]"
    >
      <button
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <motion.div
        initial={enabled ? { opacity: 0, y: 8, scale: 0.98 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="relative w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface shadow-2"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onListKey}
            placeholder="Jump to a gym, page, or city…"
            aria-label="Search commands"
            className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">esc</kbd>
        </div>

        <ul ref={listRef} role="listbox" className="max-h-[46dvh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{query}”.</li>
          )}
          {results.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <li key={item.id} role="option" aria-selected={i === cursor}>
                {showGroup && (
                  <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                    {item.group}
                  </p>
                )}
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2.5 py-2.5 text-left text-sm transition-colors",
                    i === cursor ? "bg-accent-soft text-accent" : "text-foreground",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", i === cursor ? "text-accent" : "text-muted")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-muted">{item.hint}</span>}
                  </span>
                  {i === cursor && <kbd className="font-mono text-[10px]">↵</kbd>}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted">
          ↑↓ move · ↵ open · ⌘K toggle
        </p>
      </motion.div>
    </div>
  );
}

/*
 * lib/utils.ts — shared formatting & styling helpers.
 * Why: one place for the cn() classname combinator plus date/label helpers so
 * every page formats numbers, dates, and initials the same way.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Ana Ribeiro" -> "AR" */
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDayLabel(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const key = d.toDateString();
  if (key === today.toDateString()) return "Today";
  if (key === tomorrow.toDateString()) return "Tomorrow";
  return dateFmt.format(d);
}

export function formatDate(iso: string) {
  return monthDayFmt.format(new Date(iso + "T12:00:00"));
}

/** Next occurrence of a weekday (0-6), `weeksOut` weeks in the future, as YYYY-MM-DD. */
export function nextWeekdayISO(weekday: number, weeksOut = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let delta = (weekday - d.getDay() + 7) % 7;
  if (delta === 0 && weeksOut === 0) delta = 7; // upcoming, not today-already-past
  d.setDate(d.getDate() + delta + weeksOut * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(iso: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function plural(n: number, word: string, words?: string) {
  return `${n} ${n === 1 ? word : (words ?? word + "s")}`;
}

/**
 * Build an RFC-5545 .ics file for a single event and trigger a download.
 * Why here: the open-mat card and the gym page both offer "Add to calendar",
 * and a shared builder keeps the escaping rules (commas, newlines) in one
 * place.
 */
export function downloadIcs(opts: {
  uid: string;
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
}) {
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const stamp = (d: string, t: string) => `${d.replace(/-/g, "")}T${t.replace(":", "")}00`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CHOQUE//Open Mats//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@choque.app`,
    `DTSTAMP:${stamp(opts.date, opts.start)}`,
    `DTSTART:${stamp(opts.date, opts.start)}`,
    `DTEND:${stamp(opts.date, opts.end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `LOCATION:${esc(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

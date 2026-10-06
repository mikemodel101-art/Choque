/*
 * lib/seed-admin.ts — bulk demo data for the admin surfaces.
 * Why: an empty moderation queue teaches nothing. On the first staff visit
 * this seeds realistic volume into every admin screen — pending/decided
 * submissions, gym claims, member reports, eight weeks of analytics events
 * (including zero-result searches) and audit entries — once, behind a
 * localStorage flag. Nothing here is presented as real production data, and
 * "Reset all demo data" on the profile page clears it.
 */
"use client";

import * as store from "./storage";
import { GYMS, PARTNERS } from "./data";
import type { Submission, GymClaim, Report, AppEvent } from "./types";
import { uid } from "./utils";

const SEED_FLAG = "choque:v1:admin-seeded";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export function ensureAdminSeed() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_FLAG)) return;
  localStorage.setItem(SEED_FLAG, "1");

  /* ——— Review queue: gyms + open mats, pending and decided ——— */
  const submissions: Submission[] = [
    { id: uid(), kind: "gym", title: "Roosevelt Grappling Club", summary: "Seattle · $25 drop-in (seed)", payload: { name: "Roosevelt Grappling Club", city: "Seattle", drop_in: "$25", description: "Two-room academy in Roosevelt with a strong no-gi program and a travellers-welcome policy." }, status: "pending", submittedBy: "member@choque.dev", submittedByName: "Riley Tanaka", createdAt: minutesAgo(42) },
    { id: uid(), kind: "gym", title: "Mission Judo Dojo", summary: "San Francisco · $15 drop-in (seed)", payload: { name: "Mission Judo Dojo", city: "San Francisco", drop_in: "$15", description: "Community judo with spring floors and a beginners' course every month." }, status: "pending", submittedBy: "owner@choque.dev", submittedByName: "Sam Ortega", createdAt: minutesAgo(190) },
    { id: uid(), kind: "gym", title: "Edit: Flatline BJJ", summary: "Suggested change to “schedule” (seed)", payload: { gym_id: "g-flatline", field: "schedule", value: "Saturday open mat moved to 11:00" }, status: "pending", submittedBy: "member@choque.dev", submittedByName: "Riley Tanaka", createdAt: minutesAgo(300) },
    { id: uid(), kind: "open_mat", title: "Wednesday lunchtime rolls", summary: "Wednesdays 12:00 · Portland · host: April Duarte (seed)", payload: { title: "Wednesday lunchtime rolls", city: "Portland", day_of_week: "Wednesday", start_time: "12:00", host: "April Duarte", notes: "45 minutes of rounds then back to work." }, status: "pending", submittedBy: "member@choque.dev", submittedByName: "Riley Tanaka", createdAt: minutesAgo(75) },
    { id: uid(), kind: "open_mat", title: "Sunday no-gi scramble", summary: "Sundays 10:00 · Austin · host: Theo Marsh (seed)", payload: { title: "Sunday no-gi scramble", city: "Austin", day_of_week: "Sunday", start_time: "10:00", host: "Theo Marsh", notes: "Leglock-literate room, heel hooks by agreement." }, status: "pending", submittedBy: "owner@choque.dev", submittedByName: "Sam Ortega", createdAt: minutesAgo(520) },
    { id: uid(), kind: "gym", title: "Westside Boxing Collective", summary: "Portland · $20 drop-in (seed)", payload: { name: "Westside Boxing Collective", city: "Portland", drop_in: "$20", description: "Defense-first boxing with a ten-bag line and two rings." }, status: "approved", submittedBy: "member@choque.dev", submittedByName: "Riley Tanaka", createdAt: daysAgo(3), decidedBy: "moderator@choque.dev", decidedAt: daysAgo(2) },
    { id: uid(), kind: "open_mat", title: "Friday night randori", summary: "Fridays 19:00 · Seattle (seed)", payload: { title: "Friday night randori" }, status: "rejected", submittedBy: "suspended@choque.dev", submittedByName: "Lee Mercer", createdAt: daysAgo(6), decidedBy: "admin@choque.dev", decidedAt: daysAgo(5) },
    { id: uid(), kind: "gym", title: "North Austin MMA", summary: "Austin · $30 drop-in (seed)", payload: { name: "North Austin MMA", city: "Austin", drop_in: "$30", description: "Cage wall, pad room, and an amateur fight team." }, status: "approved", submittedBy: "owner@choque.dev", submittedByName: "Sam Ortega", createdAt: daysAgo(9), decidedBy: "moderator@choque.dev", decidedAt: daysAgo(8) },
  ];
  store.setSubmissions(submissions);

  /* ——— Gym ownership claims ——— */
  const claims: GymClaim[] = [
    { id: uid(), gymId: "g-flatline", gymName: "Flatline BJJ", gymSlug: "flatline-bjj", email: "owner@choque.dev", name: "Sam Ortega", message: "I run the front desk and handle the schedule — I'd like to keep our listing current.", status: "pending", createdAt: minutesAgo(120) },
    { id: uid(), gymId: "g-harbor", gymName: "Harbor Judo Club", gymSlug: "harbor-judo-club", email: "member@choque.dev", name: "Riley Tanaka", message: "I coach the Tuesday beginners' course and can verify our visitor info.", status: "pending", createdAt: daysAgo(2) },
    { id: uid(), gymId: "g-cerro", gymName: "Cerro Striking & MMA", gymSlug: "cerro-striking-and-mma", email: "moderator@choque.dev", name: "Jordan Fields", message: "Verified with the head coach in person.", status: "approved", createdAt: daysAgo(11), decidedBy: "admin@choque.dev" },
  ];
  store.setClaims(claims);
  store.setOwnedGyms({ "owner@choque.dev": ["g-cinder"], "moderator@choque.dev": ["g-cerro"] });

  /* ——— Reports queue ——— */
  const reports: Report[] = [
    { id: uid(), targetType: "gym", targetId: "g-boiler", targetLabel: "Boiler Room Wrestling", reason: "fake_listing", details: "The address listed is now a coffee shop — pretty sure this gym closed.", reporter: "member@choque.dev", status: "open", createdAt: minutesAgo(55) },
    { id: uid(), targetType: "profile", targetId: "suspended@choque.dev", targetLabel: "Lee Mercer (suspended@choque.dev)", reason: "harassment", details: "Sent three connection requests with the same aggressive message after being declined.", reporter: "member@choque.dev", status: "open", createdAt: minutesAgo(240) },
    { id: uid(), targetType: "open_mat", targetId: "m-8", targetLabel: "Friday shark tank", reason: "safety", details: "Described as all-levels but the format is king-of-the-mat with no beginners' lane.", reporter: "member@choque.dev", status: "reviewing", createdAt: daysAgo(2) },
    { id: uid(), targetType: "gym", targetId: "g-north-star", targetLabel: "North Star Boxing", reason: "inappropriate", details: "Instagram link points to an unrelated account.", reporter: "owner@choque.dev", status: "actioned", createdAt: daysAgo(5), handledBy: "moderator@choque.dev", resolution: "Listing hidden from the directory" },
    { id: uid(), targetType: "gym", targetId: "g-golden-hour", targetLabel: "Golden Hour Muay Thai", reason: "other", details: "Drop-in fee listed as $25 but the gym now charges $30.", reporter: "moderator@choque.dev", status: "dismissed", createdAt: daysAgo(8), handledBy: "admin@choque.dev", resolution: "Dismissed — fee already corrected by owner" },
  ];
  store.setReports(reports);

  /* ——— Analytics events: 8 weeks of volume, searches and views ——— */
  const events: AppEvent[] = [];
  const searchCities = ["Portland", "Austin", "Brooklyn", "Denver", "Seattle", "San Diego"];
  for (let week = 7; week >= 0; week--) {
    const signups = 3 + ((week * 7) % 5);
    for (let i = 0; i < signups; i++)
      events.push({ id: uid(), type: "auth.sign_in", detail: `Signed in as Member (member@choque.dev)`, at: daysAgo(week * 7 + i) });
    for (let i = 0; i < 6 + (week % 3); i++) {
      const city = searchCities[(week + i) % searchCities.length];
      const zero = i === 4 && week % 2 === 0;
      events.push({
        id: uid(), type: `search.gyms`,
        detail: `q=(none) city=${city} style=${zero ? "sambo" : "any"} results=${zero ? 0 : 6} zero=${zero}`,
        at: daysAgo(week * 7 + (i % 6)),
      });
    }
    for (let i = 0; i < 4; i++) {
      const g = GYMS[(week * 3 + i) % GYMS.length];
      events.push({ id: uid(), type: "gyms.view", detail: `Viewed ${g.name}`, at: daysAgo(week * 7 + i) });
      events.push({ id: uid(), type: "gyms.list", detail: `Viewed gyms (10 results)`, at: daysAgo(week * 7 + i) });
    }
    for (let i = 0; i < 2 + (week % 2); i++)
      events.push({ id: uid(), type: "connection.sent", detail: `partner=${PARTNERS[(week + i) % PARTNERS.length].slug}`, at: daysAgo(week * 7 + i) });
    events.push({ id: uid(), type: "connection.accepted", detail: `partner=ana-ribeiro`, at: daysAgo(week * 7) });
    for (let i = 0; i < 3; i++)
      events.push({ id: uid(), type: "note.created", detail: `title=Round notes ${week}-${i}`, at: daysAgo(week * 7 + i) });
    events.push({ id: uid(), type: "partners.list", detail: `Viewed partners (12 results)`, at: daysAgo(week * 7) });
  }
  // Zero-result searches worth surfacing as expansion candidates
  ["Albuquerque", "Lisbon", "São Paulo", "Philadelphia"].forEach((city, i) => {
    events.push({ id: uid(), type: "search.gyms", detail: `q=(none) city=${city} style=any results=0 zero=true`, at: daysAgo(i + 1) });
  });

  /* ——— Audit log ——— */
  const audit: AppEvent[] = [
    { id: uid(), type: "audit.review", detail: `Approved submission “Westside Boxing Collective” by member@choque.dev`, at: daysAgo(2) },
    { id: uid(), type: "audit.review", detail: `Rejected submission “Friday night randori” by suspended@choque.dev`, at: daysAgo(5) },
    { id: uid(), type: "audit.suspension", detail: `Suspended suspended@choque.dev (Member) — reason: repeated unwanted connection requests`, at: daysAgo(5) },
    { id: uid(), type: "audit.role_change", detail: `Role member → moderator for moderator@choque.dev — reason: trusted staff for launch cities`, at: daysAgo(12) },
    { id: uid(), type: "audit.claim_review", detail: `Approved ownership of Cerro Striking & MMA for moderator@choque.dev — reason: verified in person`, at: daysAgo(11) },
    { id: uid(), type: "audit.report_action", detail: `Listing hidden from the directory for “North Star Boxing” — reason: broken external link`, at: daysAgo(5) },
    { id: uid(), type: "audit.block", detail: `Blocked lee-mercer`, at: daysAgo(4) },
  ];

  store.setEvents([...audit, ...events, ...store.getEvents()].slice(0, 400));
}

/** Remove the seed flag so the next staff visit repopulates (used by demo reset). */
export function resetAdminSeed() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEED_FLAG);
}

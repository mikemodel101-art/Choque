/*
 * lib/api.ts — async data layer for the demo build.
 * Why: every screen talks to these functions through TanStack Query exactly as
 * it would talk to a real backend. The directory data comes from lib/data.ts;
 * user mutations (RSVPs, notebook, roll requests, auth) persist to
 * lib/storage.ts (localStorage). A small simulated latency keeps loading
 * states honest without a network. Swap this file for real HTTP calls when a
 * backend is introduced — no page code changes required.
 */
import { GYMS, GYM_BY_ID, GYM_BY_SLUG, OPEN_MATS, PARTNERS } from "./data";
import * as dir from "./directory";
import { ACCOUNT_BY_EMAIL, lookupAccount, type DemoAccount } from "./demo-accounts";
import { caps } from "./permissions";
import * as store from "./storage";
import { roleLabel } from "./demo-accounts";
import type {
  AppEvent,
  AppRole,
  Discipline,
  Gym,
  NotebookEntry,
  OpenMatResolved,
  OpenMat,
  Partner,
  Profile,
  Submission,
  SubmissionKind,
  GymClaim,
  Collection,
  Connection,
  ContactCard,
  NoteLink,
  Report,
} from "./types";
import { nextWeekdayISO, uid } from "./utils";

const latency = (ms = 280) => new Promise((r) => setTimeout(r, ms + Math.random() * 160));

/* ——————————————————— Event log (in-app analytics) ——————————————————— */
function log(type: string, detail: string) {
  const e: AppEvent = { id: uid(), type, detail, at: new Date().toISOString() };
  store.addEvent(e);
}
export async function listEvents(): Promise<AppEvent[]> {
  await latency(120);
  return store.getEvents();
}

/**
 * Structured analytics (spec 5.7). Honours Do Not Track — when the browser
 * signals DNT we record nothing at all. No third-party scripts, no cookies;
 * events stay in this browser (in production: the `events` table).
 */
export function dntEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win = typeof window !== "undefined" ? (window as Window & { doNotTrack?: string }) : undefined;
  return nav.doNotTrack === "1" || win?.doNotTrack === "1" || nav.msDoNotTrack === "1";
}

export function track(name: string, props: Record<string, unknown> = {}) {
  if (dntEnabled()) return;
  const detail = Object.entries(props)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  log(name, detail || name);
}

/** Search tracking carries the result count so zero-result queries surface. */
export function trackSearch(scope: "gyms" | "partners" | "open_mats", params: {
  query?: string; city?: string; style?: string; results: number;
}) {
  if (dntEnabled()) return;
  track(`search.${scope}`, {
    q: params.query || "(none)",
    city: params.city || "any",
    style: params.style || "any",
    results: params.results,
    zero: params.results === 0,
  });
}

/* ——————————————————— Auth (demo) ——————————————————— */
function nameFromEmail(email: string) {
  const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return (
    base
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ") || "Practitioner"
  );
}

/** Normalize legacy sessions: backfill role from the account registry. */
function allAccounts(): DemoAccount[] {
  return [...ACCOUNT_BY_EMAIL.values(), ...store.getCustomAccounts()];
}

/** Registry lookup that also covers admin-added accounts. */
function accountFor(email: string): DemoAccount | undefined {
  return allAccounts().find((a) => a.email === email) ?? lookupAccount(email);
}

function normalizeSession() {
  const s = store.getSession();
  if (s && !s.role) {
    const account = accountFor(s.email);
    const patched = { ...s, role: (account?.role ?? "member") as AppRole };
    store.saveSession(patched);
    return patched;
  }
  return s;
}

export async function getSession() {
  await latency(80);
  return normalizeSession();
}

/** Is the signed-in account currently suspended (demo suspension map)? */
export function isCurrentUserSuspended(): boolean {
  const s = normalizeSession();
  if (!s) return false;
  return !!store.getSuspensions()[s.email] || s.email === "suspended@choque.dev";
}

export async function signIn(email: string) {
  await latency(450);
  if (store.getDeletedAccounts().includes(email)) {
    throw new Error("This account has been deleted by an administrator.");
  }
  const account = accountFor(email);
  const session = {
    email,
    name: account?.name ?? nameFromEmail(email),
    role: (account?.role ?? "member") as AppRole,
    createdAt: new Date().toISOString(),
  };
  store.saveSession(session);
  if (!store.getProfile()) {
    store.saveProfile({
      name: session.name,
      email,
      city: "",
      homeGymId: null,
      disciplines: ["bjj"],
      rank: "",
      bio: "",
      lookingFor: [],
      joinedAt: new Date().toISOString(),
    });
  }
  const suspended = isCurrentUserSuspended();
  log(
    "auth.sign_in",
    `Signed in as ${roleLabel(session.role)} (${email})${suspended ? " — suspended" : ""}`,
  );
  return session;
}

export async function sendMagicLink(email: string) {
  await latency(450);
  log("auth.magic_link", `Magic link requested for ${email}`);
  return { email };
}

export async function sendRecovery(email: string) {
  await latency(450);
  log("auth.recovery", `Password recovery requested for ${email}`);
  return { email };
}

export async function signOut() {
  await latency(120);
  store.clearSession();
  log("auth.sign_out", "Signed out");
}

/* ——————————————————— Profile ——————————————————— */
export async function getProfile(): Promise<Profile | null> {
  await latency(120);
  return store.getProfile();
}

export async function saveProfile(p: Profile): Promise<Profile> {
  await latency(200);
  store.saveProfile(p);
  const s = store.getSession();
  if (s && s.name !== p.name) store.saveSession({ ...s, name: p.name });
  log("profile.update", "Updated profile");
  return p;
}

/* ——————————————————— Gyms ——————————————————— */
export interface GymFilters {
  q?: string;
  discipline?: Discipline | "all";
  city?: string | "all";
  neighborhood?: string | "all";
  openMatOnly?: boolean;
  dropInsOnly?: boolean;
  verifiedOnly?: boolean;
  sort?: "rating" | "price" | "name";
}

export async function listGyms(f: GymFilters = {}): Promise<Gym[]> {
  await latency();
  let out = [...dir.gyms()];
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        (g.neighborhood ?? "").toLowerCase().includes(q) ||
        g.headCoach.toLowerCase().includes(q),
    );
  }
  if (f.discipline && f.discipline !== "all")
    out = out.filter((g) => g.disciplines.includes(f.discipline as Discipline));
  if (f.city && f.city !== "all") out = out.filter((g) => g.city === f.city);
  if (f.neighborhood && f.neighborhood !== "all") out = out.filter((g) => g.neighborhood === f.neighborhood);
  if (f.openMatOnly) out = out.filter((g) => g.hasOpenMat);
  if (f.dropInsOnly) out = out.filter((g) => g.dropInsWelcome);
  if (f.verifiedOnly) out = out.filter((g) => g.verified);
  switch (f.sort ?? "rating") {
    case "rating": out.sort((a, b) => b.rating - a.rating); break;
    case "price": out.sort((a, b) => a.priceFrom - b.priceFrom); break;
    case "name": out.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  log("gyms.list", `Viewed gyms (${out.length} results)`);
  return out;
}

export async function getGym(slug: string): Promise<Gym | null> {
  await latency();
  const g = dir.gymBySlug(slug) ?? null;
  if (g) log("gyms.view", `Viewed ${g.name}`);
  return g;
}

export async function listCities(): Promise<string[]> {
  return dir.cities();
}

export async function getSavedGyms(): Promise<string[]> {
  await latency(60);
  return store.getSavedGyms();
}

export async function toggleSavedGym(id: string): Promise<string[]> {
  await latency(150);
  const cur = store.getSavedGyms();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  store.setSavedGyms(next);
  log("gyms.save", next.includes(id) ? `Saved ${GYM_BY_ID.get(id)?.name}` : `Unsaved ${GYM_BY_ID.get(id)?.name}`);
  return next;
}

/* ——————————————————— Partners ——————————————————— */
export interface PartnerFilters {
  q?: string;
  discipline?: Discipline | "all";
  time?: string | "all"; // TimeOfDay
  weightClass?: "all" | "-65" | "65-75" | "75+";
  lookingFor?: string | "all";
}

export async function listPartners(f: PartnerFilters = {}): Promise<Partner[]> {
  await latency();
  let out = [...dir.partners()];
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter(
      (p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q),
    );
  }
  if (f.discipline && f.discipline !== "all")
    out = out.filter((p) => p.disciplines.includes(f.discipline as Discipline));
  if (f.time && f.time !== "all") out = out.filter((p) => p.availability.includes(f.time as Partner["availability"][number]));
  if (f.lookingFor && f.lookingFor !== "all")
    out = out.filter((p) => p.lookingFor.includes(f.lookingFor as Partner["lookingFor"][number]));
  if (f.weightClass && f.weightClass !== "all") {
    out = out.filter((p) =>
      f.weightClass === "-65" ? p.weightKg < 65 : f.weightClass === "65-75" ? p.weightKg >= 65 && p.weightKg <= 75 : p.weightKg > 75,
    );
  }
  out.sort((a, b) => a.lastActiveDays - b.lastActiveDays);
  log("partners.list", `Viewed partners (${out.length} results)`);
  return out;
}

export async function getPartner(slug: string): Promise<Partner | null> {
  await latency();
  const p = dir.partnerBySlug(slug) ?? null;
  if (p) log("partners.view", `Viewed ${p.name}`);
  return p;
}

const CONNECTION_DAILY_LIMIT = 10; // mirrors public.connection_daily_limit()

export async function connectionRequestsToday(): Promise<number> {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return store.getRequests().filter((r) => new Date(r.at).getTime() > dayAgo).length;
}

export async function requestRoll(partnerSlug: string, message: string) {
  await latency(350);
  // "Server-side" re-checks (mirror RLS + triggers from 00007/00008).
  if (isCurrentUserSuspended()) throw new Error("suspended");
  if (store.getBlocks().includes(partnerSlug)) throw new Error("blocked");
  const today = await connectionRequestsToday();
  if (today >= CONNECTION_DAILY_LIMIT) throw new Error("limit");

  const p = PARTNERS.find((x) => x.slug === partnerSlug);
  store.addRequest({ id: uid(), partnerSlug, message, at: new Date().toISOString() });

  // Mirror into the connections inbox as an outgoing pending request.
  const conn: Connection = {
    id: uid(),
    partnerSlug,
    partnerName: p?.name ?? partnerSlug,
    direction: "outgoing",
    status: "pending",
    message,
    createdAt: new Date().toISOString(),
  };
  store.setConnections([conn, ...store.getConnections()]);
  track("connection.sent", { partner: partnerSlug });
  log("partners.request", `Connection request sent to ${p?.name ?? partnerSlug}`);
  return store.getRequests();
}

export async function listRequests() {
  await latency(80);
  return store.getRequests();
}

/* ——————————————————— Connections inbox (mutual acceptance) ——————————————————— */

/** Contact details a partner chose to share, revealed only on acceptance. */
function contactFor(slug: string): ContactCard {
  const p = PARTNERS.find((x) => x.slug === slug);
  const handle = slug.replace(/-/g, ".");
  return {
    email: `${handle}@choque.community`,
    instagram: `@${slug.replace(/-/g, "")}`,
    preferred: p?.availability[0] ? `Best reached ${p.availability[0].toLowerCase()}s` : undefined,
  };
}

/**
 * Seed the inbox with incoming requests the first time it's opened, so the
 * accept/decline loop is demonstrable without a second account. These are
 * created at runtime (not shipped as fake content) and are cleared by reset.
 */
function ensureIncoming() {
  const existing = store.getConnections();
  if (existing.some((c) => c.direction === "incoming")) return existing;
  const seeds: Connection[] = [
    {
      id: uid(), partnerSlug: "sofia-marchetti", partnerName: "Sofia Marchetti",
      direction: "incoming", status: "pending",
      message: "Hi! I'm at your weight and also doing mornings — want to drill escapes on Tuesday?",
      createdAt: new Date(Date.now() - 36e5 * 5).toISOString(),
    },
    {
      id: uid(), partnerSlug: "tom-okafor", partnerName: "Tom Okafor",
      direction: "incoming", status: "pending",
      message: "Big guy with soft grips here — happy to trade judo sets at Sunday open mat.",
      createdAt: new Date(Date.now() - 36e5 * 26).toISOString(),
    },
  ];
  const next = [...seeds, ...existing];
  store.setConnections(next);
  return next;
}

export async function listConnections(): Promise<Connection[]> {
  await latency(160);
  const blocks = store.getBlocks();
  return ensureIncoming()
    .filter((c) => !blocks.includes(c.partnerSlug))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function respondToConnection(id: string, accept: boolean): Promise<Connection> {
  await latency(260);
  if (isCurrentUserSuspended()) throw new Error("Suspended accounts cannot respond to requests.");
  const all = store.getConnections();
  const conn = all.find((c) => c.id === id);
  if (!conn) throw new Error("Request not found.");
  if (conn.status !== "pending") throw new Error("That request was already answered.");

  const next: Connection = {
    ...conn,
    status: accept ? "accepted" : "declined",
    respondedAt: new Date().toISOString(),
    // Contact details unlock for BOTH sides only on acceptance.
    contact: accept ? contactFor(conn.partnerSlug) : undefined,
  };
  store.setConnections(all.map((c) => (c.id === id ? next : c)));
  track(accept ? "connection.accepted" : "connection.declined", { partner: conn.partnerSlug });
  log("partners.respond", `${accept ? "Accepted" : "Declined"} request from ${conn.partnerName}`);
  return next;
}

export async function cancelConnection(id: string) {
  await latency(180);
  const all = store.getConnections();
  store.setConnections(
    all.map((c) => (c.id === id ? { ...c, status: "cancelled" as const, respondedAt: new Date().toISOString() } : c)),
  );
  log("partners.cancel", "Withdrew a connection request");
  return store.getConnections();
}

/* ——————————————————— Blocking ——————————————————— */
export async function listBlocks() {
  await latency(60);
  return store.getBlocks();
}

export async function toggleBlock(slug: string) {
  await latency(200);
  const cur = store.getBlocks();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  store.setBlocks(next);
  // Blocking tears down any connection between the two people.
  if (!cur.includes(slug)) {
    store.setConnections(store.getConnections().filter((c) => c.partnerSlug !== slug));
  }
  log("audit.block", `${next.includes(slug) ? "Blocked" : "Unblocked"} ${slug}`);
  return next;
}

/* ——————————————————— Submissions (suggest gym / submit open mat) ——————————————————— */
export interface SubmissionInput {
  title: string;
  summary: string;
  payload: Record<string, string>;
}

export async function createSubmission(kind: SubmissionKind, input: SubmissionInput): Promise<Submission> {
  await latency(300);
  const session = normalizeSession();
  const c = caps(session, { suspended: isCurrentUserSuspended() });
  if (!session) throw new Error("sign-in required");
  if (kind === "gym" && !c.canSubmitGym) throw new Error("Your account cannot submit gyms right now.");
  if (kind === "open_mat" && !c.canSubmitMat) throw new Error("Your account cannot submit open mats right now.");

  const sub: Submission = {
    id: uid(),
    kind,
    title: input.title,
    summary: input.summary,
    payload: input.payload,
    status: "pending",
    submittedBy: session.email,
    submittedByName: session.name,
    createdAt: new Date().toISOString(),
  };
  store.setSubmissions([sub, ...store.getSubmissions()]);
  log(
    kind === "gym" ? "submit.gym" : "submit.open_mat",
    `Submitted ${kind === "gym" ? "gym" : "open mat"} “${input.title}” for review`,
  );
  return sub;
}

/* ——————————————————— Staff tools (moderator / admin) ——————————————————— */
function requireCaps() {
  const session = normalizeSession();
  const c = caps(session, { suspended: isCurrentUserSuspended() });
  if (!session) throw new Error("sign-in required");
  return { session, c };
}

export async function listSubmissions(mineOnly = false): Promise<Submission[]> {
  await latency(180);
  const { session } = requireCaps();
  const all = store.getSubmissions();
  if (mineOnly) return all.filter((s) => s.submittedBy === session!.email);
  return all;
}

export async function reviewSubmission(id: string, approve: boolean) {
  await latency(220);
  const { session, c } = requireCaps();
  if (!c.canApprove) throw new Error("Only staff can review submissions.");
  const all = store.getSubmissions();
  const sub = all.find((s) => s.id === id);
  if (!sub) throw new Error("Submission not found.");
  const next: Submission = {
    ...sub,
    status: approve ? "approved" : "rejected",
    decidedBy: session!.email,
    decidedAt: new Date().toISOString(),
  };
  store.setSubmissions(all.map((s) => (s.id === id ? next : s)));
  log("audit.review", `${approve ? "Approved" : "Rejected"} submission “${sub.title}” by ${sub.submittedBy}`);
  return next;
}

/** Demo user directory (the five demo accounts + suspension state). */
export interface DemoUserRow {
  email: string;
  name: string;
  role: AppRole;
  suspended: boolean;
  isSelf: boolean;
}

export async function listDemoUsers(query = ""): Promise<DemoUserRow[]> {
  await latency(140);
  const session = normalizeSession();
  const map = store.getSuspensions();
  const roles = store.getRoleOverrides();
  const q = query.trim().toLowerCase();
  return allAccounts()
    .map((a) => ({
      email: a.email,
      name: a.name,
      role: (roles[a.email] ?? a.role) as AppRole,
      suspended: map[a.email] ?? a.email === "suspended@choque.dev",
      isSelf: session?.email === a.email,
    }))
    .filter((u) =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q),
    );
}

export async function setUserSuspended(email: string, suspended: boolean, reason: string) {
  await latency(220);
  const { c } = requireCaps();
  const target = accountFor(email);
  if (!target) throw new Error("Unknown account.");
  if (!reason || reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");

  if (suspended) {
    // Mirrors 00007/00008: mods suspend members; only admins suspend staff.
    if (!c.canSuspend) throw new Error("Only staff can suspend accounts.");
    if ((target.role === "moderator" || target.role === "admin") && !c.isAdmin)
      throw new Error("Only admins can suspend staff.");
    const admins = await listDemoUsers();
    if (target.role === "admin" && admins.filter((u) => u.role === "admin" && !u.suspended).length <= 1)
      throw new Error("The last remaining admin cannot be suspended.");
  } else {
    // Unsuspend is ADMIN ONLY.
    if (!c.canUnsuspend) throw new Error("Only admins can unsuspend accounts.");
  }

  store.setSuspensions({ ...store.getSuspensions(), [email]: suspended });
  store.refreshSessionCookie();
  log(
    "audit.suspension",
    `${suspended ? "Suspended" : "Unsuspended"} ${email} (${roleLabel(target.role)}) — reason: ${reason.trim()}`,
  );
  return listDemoUsers();
}

/** Promote / demote (ADMIN ONLY). Last admin is protected, reason is logged. */
export async function setUserRole(email: string, role: AppRole, reason: string) {
  await latency(240);
  const { session, c } = requireCaps();
  if (!c.isAdmin) throw new Error("Only admins can change roles.");
  if (!reason || reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");
  const target = accountFor(email);
  if (!target) throw new Error("Unknown account.");

  const users = await listDemoUsers();
  const prev = store.getRoleOverrides()[email] ?? target.role;
  if (prev === "admin" && role !== "admin") {
    const activeAdmins = users.filter((u) => u.role === "admin" && !u.suspended).length;
    if (activeAdmins <= 1) throw new Error("The last remaining admin cannot be demoted.");
  }

  store.setRoleOverrides({ ...store.getRoleOverrides(), [email]: role });
  // Keep the live session honest if an admin changed their own role.
  if (session?.email === email) {
    store.saveSession({ ...session, role });
  }
  store.refreshSessionCookie();
  log(
    "audit.role_change",
    `Role ${prev} → ${role} for ${email} — reason: ${reason.trim()}`,
  );
  return listDemoUsers();
}

/* ——————————————————— Gym claims & ownership ——————————————————— */
export async function listClaims(): Promise<GymClaim[]> {
  await latency(160);
  return store.getClaims();
}

export async function claimGym(gymId: string, message: string) {
  await latency(300);
  const session = normalizeSession();
  const c = caps(session, { suspended: isCurrentUserSuspended() });
  if (!session) throw new Error("Sign in to claim a gym.");
  if (!c.canPost) throw new Error("Suspended accounts cannot submit claims.");
  const gym = GYM_BY_ID.get(gymId);
  if (!gym) throw new Error("Unknown gym.");
  if (store.getClaims().some((x) => x.gymId === gymId && x.email === session.email))
    throw new Error("You already have a claim on this gym.");

  const claim: GymClaim = {
    id: uid(), gymId, gymName: gym.name, gymSlug: gym.slug,
    email: session.email, name: session.name, message,
    status: "pending", createdAt: new Date().toISOString(),
  };
  store.setClaims([claim, ...store.getClaims()]);
  log("submit.claim", `Ownership claim filed for ${gym.name}`);
  return claim;
}

export async function reviewClaim(id: string, approve: boolean, reason: string) {
  await latency(240);
  const { session, c } = requireCaps();
  if (!c.canApprove) throw new Error("Only staff can review claims.");
  if (!reason || reason.trim().length < 5) throw new Error("A logged reason of 5+ characters is required.");
  const all = store.getClaims();
  const claim = all.find((x) => x.id === id);
  if (!claim) throw new Error("Claim not found.");
  const next: GymClaim = {
    ...claim,
    status: approve ? "approved" : "rejected",
    decidedBy: session!.email,
  };
  store.setClaims(all.map((x) => (x.id === id ? next : x)));
  if (approve) {
    store.setOwnedGyms({ ...store.getOwnedGyms(), [claim.email]: [...(store.getOwnedGyms()[claim.email] ?? []), claim.gymId] });
    // Promote the claimant to the gym-owner role in the demo registry.
    store.setRoleOverrides({ ...store.getRoleOverrides(), [claim.email]: "owner" });
  }
  log(
    "audit.claim_review",
    `${approve ? "Approved" : "Rejected"} ownership of ${claim.gymName} for ${claim.email} — reason: ${reason.trim()}`,
  );
  return next;
}

/** Gyms the signed-in user is an approved owner of. */
export async function myOwnedGyms(): Promise<string[]> {
  const s = normalizeSession();
  if (!s) return [];
  return store.getOwnedGyms()[s.email] ?? [];
}

/** City waitlist signup (section 6). */
export async function joinWaitlist(city: string, email: string) {
  await latency(280);
  const entry = { id: uid(), city: city.trim(), email: email.trim(), at: new Date().toISOString() };
  const list = store.getWaitlist();
  if (list.some((x) => x.email.toLowerCase() === entry.email.toLowerCase()
      && x.city.toLowerCase() === entry.city.toLowerCase()))
    throw new Error(`You're already on the ${city} list.`);
  store.setWaitlist([entry, ...list]);
  track("waitlist.joined", { city: entry.city });
  log("waitlist.joined", `${email} joined the ${city} waitlist`);
  return entry;
}

/* ——————————————————— Reports & edit suggestions ——————————————————— */
export async function reportListing(
  targetType: "gym" | "open_mat" | "profile",
  targetId: string,
  reason: string,
  details: string,
  targetLabel?: string,
) {
  await latency(280);
  const session = normalizeSession();
  if (!session) throw new Error("Sign in to report.");
  if (isCurrentUserSuspended()) throw new Error("Suspended accounts cannot file reports.");

  const report: Report = {
    id: uid(),
    targetType,
    targetId,
    targetLabel: targetLabel ?? GYM_BY_ID.get(targetId)?.name ?? targetId,
    reason,
    details,
    reporter: session.email,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  store.setReports([report, ...store.getReports()]);
  log("audit.report", `Reported ${targetType} “${report.targetLabel}” (${reason})`);
  return report;
}

/* ——————————————————— Reports queue (staff) ——————————————————— */
export async function listReports(): Promise<Report[]> {
  await latency(150);
  const { c } = requireCaps();
  if (!c.canApprove) throw new Error("Only staff can view the reports queue.");
  return store.getReports();
}

export type ReportAction = "dismiss" | "hide" | "warn" | "suspend";

export async function actionReport(id: string, action: ReportAction, reason: string) {
  await latency(260);
  const { session, c } = requireCaps();
  if (!c.canApprove) throw new Error("Only staff can action reports.");
  if (!reason || reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");

  const all = store.getReports();
  const report = all.find((r) => r.id === id);
  if (!report) throw new Error("Report not found.");

  const resolution: Record<ReportAction, string> = {
    dismiss: "Dismissed — no action needed",
    hide: "Listing hidden from the directory",
    warn: "Warning sent to the account",
    suspend: "Account suspended",
  };

  const next: Report = {
    ...report,
    status: action === "dismiss" ? "dismissed" : "actioned",
    handledBy: session!.email,
    resolution: resolution[action],
  };
  store.setReports(all.map((r) => (r.id === id ? next : r)));

  // "Suspend user" from the queue routes through the same guarded path.
  if (action === "suspend" && report.targetType === "profile") {
    try {
      await setUserSuspended(report.targetId, true, `Report ${report.id}: ${reason.trim()}`);
    } catch {
      /* guard rules (e.g. last admin) still win — the report stays actioned */
    }
  }

  log("audit.report_action", `${resolution[action]} for “${report.targetLabel}” — reason: ${reason.trim()}`);
  return next;
}

export async function suggestEdit(gymId: string, field: string, value: string) {
  await latency(280);
  const gym = GYM_BY_ID.get(gymId);
  const session = normalizeSession();
  if (!session) throw new Error("Sign in to suggest an edit.");
  if (isCurrentUserSuspended()) throw new Error("Suspended accounts cannot suggest edits.");
  return createSubmission("gym", {
    title: `Edit: ${gym?.name ?? gymId}`,
    summary: `Suggested change to “${field}”`,
    payload: { gym_id: gymId, field, value },
  });
}

/* ——————————————————— Onboarding ——————————————————— */
export async function getOnboarded() {
  return store.getOnboarded();
}
export async function completeOnboarding(profile: Profile) {
  await latency(260);
  store.saveProfile(profile);
  store.setOnboarded(true);
  log("profile.onboarded", "Completed onboarding");
  return profile;
}


/* ——————————————————— Admin user CRUD (admin only, every action audited) ——————————————————— */
export interface AdminUserInput { email: string; name: string; role: AppRole; reason: string }

export async function adminAddUser(input: AdminUserInput): Promise<DemoUserRow[]> {
  await latency(260);
  const { c } = requireCaps();
  if (!c.isAdmin) throw new Error("Only admins can add users.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Enter a valid email address.");
  if (!input.name.trim() || input.name.trim().length < 2) throw new Error("Name must be at least 2 characters.");
  if (!input.reason || input.reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");
  if (accountFor(input.email)) throw new Error("An account with that email already exists.");

  const account: DemoAccount = {
    role: input.role,
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    label: roleLabel(input.role),
    blurb: `Admin-added ${roleLabel(input.role)}.`,
  };
  store.setCustomAccounts([...store.getCustomAccounts(), account]);
  log("audit.user_add", `Added ${account.email} as ${roleLabel(input.role)} — reason: ${input.reason.trim()}`);
  return listDemoUsers();
}

export interface AdminProfileEdit {
  email: string;
  name?: string;
  city?: string;
  rank?: string;
  bio?: string;
  reason: string;
}

export async function adminEditUserProfile(input: AdminProfileEdit): Promise<DemoUserRow[]> {
  await latency(240);
  const { c } = requireCaps();
  if (!c.isAdmin) throw new Error("Only admins can edit profiles.");
  if (!input.reason || input.reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");
  const target = accountFor(input.email);
  if (!target) throw new Error("Unknown account.");

  // Rename propagates to the account record itself (and its live session).
  if (input.name && input.name.trim() !== target.name && input.name.trim().length >= 2) {
    const rename = (a: DemoAccount) => (a.email === input.email ? { ...a, name: input.name!.trim() } : a);
    if (lookupAccount(input.email)) {
      // built-in: re-register under the same identity
      ACCOUNT_BY_EMAIL.set(input.email, rename(ACCOUNT_BY_EMAIL.get(input.email)!));
    }
    store.setCustomAccounts(store.getCustomAccounts().map(rename));
  }

  const profiles = store.getAdminProfiles();
  profiles[input.email] = {
    ...(profiles[input.email] ?? {}),
    ...(input.city !== undefined ? { city: input.city.trim() } : {}),
    ...(input.rank !== undefined ? { rank: input.rank.trim() } : {}),
    ...(input.bio !== undefined ? { bio: input.bio.trim() } : {}),
  };
  store.setAdminProfiles(profiles);
  log("audit.user_edit", `Edited profile ${input.email} — reason: ${input.reason.trim()}`);
  return listDemoUsers();
}

export async function adminDeleteUser(email: string, reason: string): Promise<DemoUserRow[]> {
  await latency(240);
  const { session, c } = requireCaps();
  if (!c.isAdmin) throw new Error("Only admins can delete accounts.");
  if (!reason || reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");
  if (session?.email === email) throw new Error("You cannot delete your own account.");
  const target = accountFor(email);
  if (!target) throw new Error("Unknown account.");
  const users = await listDemoUsers();
  if (target.role === "admin" && users.filter((u) => u.role === "admin").length <= 1)
    throw new Error("The last remaining admin cannot be deleted.");

  store.setDeletedAccounts([...store.getDeletedAccounts(), email]);
  log("audit.user_delete", `Deleted account ${email} (${roleLabel(target.role)}) — reason: ${reason.trim()}`);
  return listDemoUsers();
}

export async function adminRestoreUser(email: string, reason: string): Promise<DemoUserRow[]> {
  await latency(200);
  const { c } = requireCaps();
  if (!c.isAdmin) throw new Error("Only admins can restore accounts.");
  if (!reason || reason.trim().length < 5)
    throw new Error("A reason of at least 5 characters is required and will be logged.");
  store.setDeletedAccounts(store.getDeletedAccounts().filter((e) => e !== email));
  store.setSuspensions({ ...store.getSuspensions(), [email]: false });
  log("audit.user_restore", `Restored account ${email} — reason: ${reason.trim()}`);
  return listDemoUsers();
}


/* ——————————————————— Admin directory CRUD (staff; every action audited) ——————————————————— */
export interface GymInput {
  name: string; city: string; neighborhood?: string; state?: string;
  dropIn?: number; priceFrom?: number; description?: string; visitorFriendly?: boolean;
}
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function requireStaffReason(reason: string) {
  const { c } = requireCaps();
  if (!c.isStaff) throw new Error("Only staff can manage directory content.");
  if (!reason || reason.trim().length < 5) throw new Error("A reason of at least 5 characters is required.");
}

export async function adminCreateGym(input: GymInput, reason: string): Promise<Gym> {
  await latency(260);
  requireStaffReason(reason);
  if (!input.name.trim() || input.name.trim().length < 3) throw new Error("Gym name must be at least 3 characters.");
  if (!input.city.trim()) throw new Error("City is required.");
  const slug = slugify(input.name);
  if (dir.gymBySlug(slug)) throw new Error("A gym with that name already exists.");

  const gym: Gym = {
    id: `g-${slug}-${uid().slice(0, 4)}`, slug,
    name: input.name.trim(), city: input.city.trim(),
    state: (input.state ?? "").trim().toUpperCase() || "OR",
    address: `${input.city.trim()}, ${(input.state ?? "").trim().toUpperCase() || "OR"}`,
    neighborhood: input.neighborhood?.trim() || input.city.trim(),
    disciplines: ["bjj"], rating: 0, reviews: 0,
    priceFrom: input.priceFrom ?? 0, dropIn: input.dropIn ?? 0,
    headCoach: "", coaches: [], image: GYMS[0].image, gallery: [],
    about: input.description?.trim() ?? "Added by staff — description pending.",
    amenities: [], womenOnly: false, kids: false, verified: false, affiliate: false,
    schedule: [], visitorFriendly: !!input.visitorFriendly,
  };
  store.setGymAdds([gym, ...store.getGymAdds()]);
  log("audit.gym_add", `Added gym “${gym.name}” (${gym.city}) — reason: ${reason.trim()}`);
  return gym;
}

export async function adminUpdateGym(slug: string, input: Partial<GymInput>, reason: string): Promise<Gym> {
  await latency(240);
  requireStaffReason(reason);
  const gym = dir.gymBySlug(slug);
  if (!gym) throw new Error("Gym not found.");
  const edits = store.getGymEdits();
  edits[slug] = { ...(edits[slug] ?? {}), ...input } as Partial<Gym>;
  store.setGymEdits(edits);
  log("audit.gym_edit", `Edited gym “${gym.name}” (${Object.keys(input).join(", ")}) — reason: ${reason.trim()}`);
  return { ...gym, ...input } as Gym;
}

export async function adminDeleteGym(slug: string, reason: string) {
  await latency(220);
  requireStaffReason(reason);
  const gym = dir.gymBySlug(slug);
  if (!gym) throw new Error("Gym not found.");
  store.setGymDeletes([...store.getGymDeletes(), slug]);
  log("audit.gym_delete", `Deleted gym “${gym.name}” — reason: ${reason.trim()}`);
}

export interface MatInput {
  gymId: string; title: string; weekday: number; start: string; end: string;
  level?: "All levels" | "Beginner" | "Competition"; fee?: number; hostName?: string;
  visitorRequirements?: string; notes?: string;
}

function addHour(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${String((h ?? 9) + 2).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

export async function adminCreateMat(input: MatInput, reason: string): Promise<OpenMat> {
  await latency(260);
  requireStaffReason(reason);
  if (!input.title.trim()) throw new Error("Title is required.");
  const gym = dir.gymById(input.gymId);
  if (!gym) throw new Error("Pick a host gym.");

  const mat: OpenMat = {
    id: `m-${uid().slice(0, 8)}`, gymId: input.gymId,
    title: input.title.trim(), discipline: "bjj", weekday: input.weekday,
    weekOffset: 0, start: input.start, end: input.end || addHour(input.start),
    level: input.level ?? "All levels", fee: input.fee ?? 0,
    capacity: 30, attendeesBase: 0, womenOnly: false,
    hostName: input.hostName?.trim() || gym.headCoach || gym.name,
    hostContact: gym.email ?? "", visitorRequirements: input.visitorRequirements?.trim() || "Check with the host",
    notes: input.notes?.trim() ?? "",
  };
  store.setMatAdds([mat, ...store.getMatAdds()]);
  log("audit.mat_add", `Added open mat “${mat.title}” at ${gym.name} — reason: ${reason.trim()}`);
  return mat;
}

export async function adminUpdateMat(id: string, input: Partial<MatInput>, reason: string) {
  await latency(220);
  requireStaffReason(reason);
  const mat = dir.mats().find((m) => m.id === id);
  if (!mat) throw new Error("Open mat not found.");
  const edits = store.getMatEdits();
  edits[id] = { ...(edits[id] ?? {}), ...input } as Partial<OpenMat>;
  store.setMatEdits(edits);
  log("audit.mat_edit", `Edited open mat “${mat.title}” — reason: ${reason.trim()}`);
}

export async function adminDeleteMat(id: string, reason: string) {
  await latency(200);
  requireStaffReason(reason);
  const mat = dir.mats().find((m) => m.id === id);
  if (!mat) throw new Error("Open mat not found.");
  store.setMatDeletes([...store.getMatDeletes(), id]);
  log("audit.mat_delete", `Deleted open mat “${mat.title}” — reason: ${reason.trim()}`);
}

export interface PartnerInput {
  name: string; city: string; rank?: string; disciplines?: string[];
  availability?: string[]; bio?: string; weightKg?: number;
}

export async function adminCreatePartner(input: PartnerInput, reason: string): Promise<Partner> {
  await latency(260);
  requireStaffReason(reason);
  if (!input.name.trim()) throw new Error("Name is required.");
  const slug = slugify(input.name);
  if (dir.partnerBySlug(slug)) throw new Error("Someone with that name already exists.");

  const partner: Partner = {
    id: `p-${uid().slice(0, 6)}`, slug,
    name: input.name.trim(), city: input.city.trim() || "Portland", state: "OR",
    homeGymId: GYMS[0].id, disciplines: (input.disciplines as Partner["disciplines"]) ?? ["bjj"],
    primaryDiscipline: ((input.disciplines?.[0] as Partner["primaryDiscipline"]) ?? "bjj"),
    rank: input.rank?.trim() || "Practitioner",
    yearsTraining: 1, weightKg: input.weightKg ?? 70,
    availability: (input.availability as Partner["availability"]) ?? ["Evening"],
    weekdays: ["Mon", "Wed"], lookingFor: ["Open mat"],
    bio: input.bio?.trim() ?? "Added by staff.",
    lastActiveDays: 0, verified: false,
  };
  store.setPartnerAdds([partner, ...store.getPartnerAdds()]);
  log("audit.partner_add", `Added practitioner “${partner.name}” — reason: ${reason.trim()}`);
  return partner;
}

export async function adminUpdatePartner(slug: string, input: Partial<PartnerInput>, reason: string) {
  await latency(220);
  requireStaffReason(reason);
  const partner = dir.partnerBySlug(slug);
  if (!partner) throw new Error("Practitioner not found.");
  const edits = store.getPartnerEdits();
  edits[slug] = { ...(edits[slug] ?? {}), ...input } as Partial<Partner>;
  store.setPartnerEdits(edits);
  log("audit.partner_edit", `Edited practitioner “${partner.name}” — reason: ${reason.trim()}`);
}

export async function adminDeletePartner(slug: string, reason: string) {
  await latency(200);
  requireStaffReason(reason);
  const partner = dir.partnerBySlug(slug);
  if (!partner) throw new Error("Practitioner not found.");
  store.setPartnerDeletes([...store.getPartnerDeletes(), slug]);
  log("audit.partner_delete", `Deleted practitioner “${partner.name}” — reason: ${reason.trim()}`);
}

/** Distinct demo audit log entries (auth + moderation events). */
export async function listAuditEvents(): Promise<AppEvent[]> {
  await latency(120);
  const { c } = requireCaps();
  if (!c.canViewAudit) throw new Error("Only admins can view the audit log.");
  return store.getEvents().filter((e) => e.type.startsWith("audit.") || e.type.startsWith("auth."));
}

/* ——————————————————— Open mats ——————————————————— */
export interface MatFilters {
  discipline?: Discipline | "all";
  city?: string | "all";
  level?: string | "all";
  freeOnly?: boolean;
  mine?: boolean;
}

export async function listOpenMats(f: MatFilters = {}): Promise<OpenMatResolved[]> {
  await latency();
  const rsvps = store.getRsvps();
  let out: OpenMatResolved[] = dir.mats().map((m) => {
    const gym = dir.gymById(m.gymId) ?? GYM_BY_ID.get(m.gymId)!;
    if (!gym) return null;
    const rsvped = rsvps.includes(m.id);
    const attendees = m.attendeesBase + (rsvped ? 1 : 0);
    return {
      ...m,
      gym,
      date: nextWeekdayISO(m.weekday, m.weekOffset),
      rsvped,
      attendees,
      full: attendees >= m.capacity,
    } as OpenMatResolved;
  }).filter(Boolean) as OpenMatResolved[];
  if (f.discipline && f.discipline !== "all") out = out.filter((m) => m.discipline === f.discipline);
  if (f.city && f.city !== "all") out = out.filter((m) => m.gym.city === f.city);
  if (f.level && f.level !== "all") out = out.filter((m) => m.level === f.level);
  if (f.freeOnly) out = out.filter((m) => m.fee === 0);
  if (f.mine) out = out.filter((m) => m.rsvped);
  out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return out;
}

export async function toggleRsvp(matId: string) {
  await latency(180);
  const cur = store.getRsvps();
  const next = cur.includes(matId) ? cur.filter((x) => x !== matId) : [...cur, matId];
  store.setRsvps(next);
  const m = OPEN_MATS.find((x) => x.id === matId);
  log("mats.rsvp", `${next.includes(matId) ? "RSVP'd" : "Cancelled"} — ${m?.title ?? matId}`);
  return next;
}

/* ——————————————————— Notebook ——————————————————— */
export async function listNotebookEntries(): Promise<NotebookEntry[]> {
  await latency(150);
  // Stored order is canonical: new entries prepend, and drag-to-reorder
  // (dnd-kit) commits overwrite it via reorderNotebook().
  return store.getNotebook();
}

export async function createEntry(
  input: Omit<NotebookEntry, "id" | "createdAt" | "updatedAt">,
): Promise<NotebookEntry> {
  await latency(200);
  const now = new Date().toISOString();
  const entry: NotebookEntry = { ...input, id: uid(), createdAt: now, updatedAt: now };
  // Offline? Park the write and let flushOutbox() replay it later.
  if (!isOnline()) {
    queueWrite(entry);
    return entry;
  }
  store.setNotebook([entry, ...store.getNotebook()]);
  track("note.created", { title: entry.title });
  log("notebook.create", `Logged "${entry.title}"`);
  return entry;
}

export async function updateEntry(
  id: string,
  input: Omit<NotebookEntry, "id" | "createdAt" | "updatedAt">,
): Promise<NotebookEntry> {
  await latency(200);
  const entries = store.getNotebook();
  const existing = entries.find((e) => e.id === id);
  const updated: NotebookEntry = {
    ...input,
    id,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!isOnline()) {
    queueWrite(updated);
    return updated;
  }
  store.setNotebook(entries.map((e) => (e.id === id ? updated : e)));
  log("notebook.update", `Updated "${updated.title}"`);
  return updated;
}

export async function deleteEntry(id: string) {
  await latency(150);
  store.setNotebook(store.getNotebook().filter((e) => e.id !== id));
  log("notebook.delete", "Deleted an entry");
}

export function exportNotebookJSON(): string {
  return JSON.stringify(
    { notes: store.getNotebook(), collections: store.getCollections() },
    null,
    2,
  );
}

/** Export the whole notebook as a single Markdown document. */
export function exportNotebookMarkdown(): string {
  const collections = store.getCollections();
  const notes = store.getNotebook();
  const lines: string[] = ["# CHOQUE training notebook", ""];
  lines.push(`_Exported ${new Date().toLocaleDateString()} · ${notes.length} entries_`, "");

  for (const n of notes) {
    lines.push(`## ${n.pinned ? "📌 " : ""}${n.title}`);
    lines.push("");
    lines.push(`**${n.date}** · ${n.type} · ${n.rounds} rounds · ${n.minutes} min · intensity ${n.intensity}/5`);
    if (n.position || n.topic) lines.push(`Position: ${n.position || "—"} · Topic: ${n.topic || "—"}`);
    const names = (n.collectionIds ?? [])
      .map((id) => collections.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length) lines.push(`Collections: ${names.join(", ")}`);
    if (n.techniques.length) lines.push(`Techniques: ${n.techniques.map((t) => `\`${t}\``).join(", ")}`);
    lines.push("");
    if (n.worked) lines.push(`- ✅ **Worked:** ${n.worked}`);
    if (n.fix) lines.push(`- 🔧 **Fix:** ${n.fix}`);
    if (n.worked || n.fix) lines.push("");
    if (n.notes) lines.push(n.notes, "");
    for (const l of n.links ?? []) {
      const t = l.startSeconds ? ` (from ${l.startSeconds}s)` : "";
      lines.push(`- 🎥 [${l.title || l.youtubeId}](${l.url})${t}`);
    }
    if ((n.links ?? []).length) lines.push("");
    lines.push("---", "");
  }
  return lines.join("\n");
}

/* ——————————————————— Collections (folders) ——————————————————— */
export async function listCollections(): Promise<Collection[]> {
  await latency(90);
  return store.getCollections().sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createCollection(name: string): Promise<Collection> {
  await latency(160);
  const existing = store.getCollections();
  if (existing.some((c) => c.name.toLowerCase() === name.trim().toLowerCase()))
    throw new Error("You already have a collection with that name.");
  const c: Collection = { id: uid(), name: name.trim(), sortOrder: existing.length };
  store.setCollections([...existing, c]);
  log("notebook.collection", `Created collection “${c.name}”`);
  return c;
}

export async function deleteCollection(id: string) {
  await latency(140);
  store.setCollections(store.getCollections().filter((c) => c.id !== id));
  store.setNotebook(
    store.getNotebook().map((n) => ({
      ...n,
      collectionIds: (n.collectionIds ?? []).filter((c) => c !== id),
    })),
  );
  log("notebook.collection", "Deleted a collection");
}

/* ——————————————————— Note actions: pin / duplicate ——————————————————— */
export async function togglePin(id: string) {
  await latency(120);
  store.setNotebook(
    store.getNotebook().map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n)),
  );
  log("notebook.pin", "Toggled a pinned note");
  return store.getNotebook();
}

export async function duplicateEntry(id: string): Promise<NotebookEntry> {
  await latency(180);
  const src = store.getNotebook().find((n) => n.id === id);
  if (!src) throw new Error("Entry not found.");
  const now = new Date().toISOString();
  const copy: NotebookEntry = {
    ...src,
    id: uid(),
    title: `${src.title} (copy)`,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  store.setNotebook([copy, ...store.getNotebook()]);
  log("notebook.duplicate", `Duplicated “${src.title}”`);
  return copy;
}

/* ——————————————————— YouTube link parsing ——————————————————— */
/**
 * Accepts youtu.be/ID, youtube.com/watch?v=ID, /embed/ID and /shorts/ID,
 * preserving ?t= / &start= timestamps. Returns null when nothing parses, so
 * the UI can show a validation message instead of embedding garbage.
 */
export function parseYouTube(input: string): NoteLink | null {
  const raw = input.trim();
  if (!raw) return null;
  let id = "";
  let start: number | undefined;

  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? "";
    }
    const t = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (t) {
      const m = /^(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
      start = m && (m[1] || m[2])
        ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)
        : Number.parseInt(t, 10) || undefined;
    }
  } catch {
    return null;
  }

  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return {
    id: uid(),
    url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ""}`,
    youtubeId: id,
    title: "",
    startSeconds: start,
  };
}

/* ——————————————————— Offline-tolerant writes ——————————————————— */
export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Queue a write that couldn't be persisted (offline) for later retry. */
export function queueWrite(entry: unknown) {
  store.setOutbox([...store.getOutbox(), { id: uid(), at: new Date().toISOString(), entry }]);
}

export function pendingWrites() {
  return store.getOutbox().length;
}

/** Flush queued notebook writes once connectivity returns. */
export async function flushOutbox() {
  const queued = store.getOutbox();
  if (queued.length === 0) return 0;
  for (const q of queued) {
    const e = q.entry as NotebookEntry;
    const existing = store.getNotebook().find((n) => n.id === e.id);
    store.setNotebook(
      existing
        ? store.getNotebook().map((n) => (n.id === e.id ? e : n))
        : [e, ...store.getNotebook()],
    );
  }
  store.setOutbox([]);
  log("notebook.sync", `Synced ${queued.length} offline change(s)`);
  return queued.length;
}

/** Persist a drag-to-reorder commit from dnd-kit (ordered id list). */
export async function reorderNotebook(orderedIds: string[]) {
  await latency(120);
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  store.setNotebook([...store.getNotebook()].sort(
    (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
  ));
  log("notebook.reorder", `Reordered ${orderedIds.length} entries`);
}

// Today's date as YYYY-MM-DD (local) — used by the notebook streak logic.
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ——————————————————— Account actions (demo) ——————————————————— */
export async function requestEmailChange(newEmail: string) {
  await latency(400);
  log("auth.email_change", `Verification link sent to ${newEmail}`);
  return { email: newEmail };
}

export async function changePassword() {
  await latency(400);
  log("auth.password_change", "Password updated");
  return { ok: true };
}

export async function listSessionHistory() {
  // Demo: one active session per device
  const s = store.getSession();
  return s ? [{ id: "current", device: "This browser", since: s.createdAt }] : [];
}

export async function resetDemoData() {
  await latency(200);
  const session = store.getSession();
  store.resetAll();
  if (session) store.saveSession(session); // keep the user signed in
  log("demo.reset", "Reset demo data");
}

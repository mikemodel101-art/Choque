/*
 * lib/storage.ts — localStorage persistence layer.
 * Why: this is a no-database demo build, so everything the user creates —
 * their session, notebook entries, open-mat RSVPs, roll requests, saved gyms,
 * and activity events — is persisted in the browser with a versioned key
 * namespace. All reads are defensive (bad JSON degrades to defaults) so a
 * corrupt value can never crash the app.
 */
import type { AppEvent, NotebookEntry, Profile } from "./types";

const PREFIX = "choque:v1:" as const;

const KEYS = {
  session: `${PREFIX}session`,
  profile: `${PREFIX}profile`,
  notebook: `${PREFIX}notebook`,
  rsvps: `${PREFIX}rsvps`,
  requests: `${PREFIX}requests`,
  savedGyms: `${PREFIX}saved-gyms`,
  events: `${PREFIX}events`,
  submissions: `${PREFIX}submissions`,
  suspensions: `${PREFIX}suspensions`,
  roles: `${PREFIX}roles`,
  onboarding: `${PREFIX}onboarding`,
  claims: `${PREFIX}claims`,
  ownedGyms: `${PREFIX}owned-gyms`,
  collections: `${PREFIX}collections`,
  connections: `${PREFIX}connections`,
  reports: `${PREFIX}reports`,
  blocks: `${PREFIX}blocks`,
  outbox: `${PREFIX}outbox`,
  locale: `${PREFIX}locale`,
  waitlist: `${PREFIX}waitlist`,
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ——— Session (demo auth) ——— */
import type {
  AppRole, Collection, Connection, GymClaim, Report, Submission,
} from "./types";

export interface Session {
  email: string;
  name: string;
  role: AppRole;
  createdAt: string;
}
export const getSession = () => read<Session | null>(KEYS.session, null);

/**
 * Mirror the session into a cookie so Next.js middleware (which cannot read
 * localStorage) can gate /admin and /(app) routes at the edge. The cookie is
 * a convenience for routing only — server actions re-verify every time.
 */
function syncSessionCookie(s: Session | null) {
  if (typeof document === "undefined") return;
  if (!s) {
    document.cookie = "choque_session=; Path=/; Max-Age=0; SameSite=Lax";
    return;
  }
  const payload = encodeURIComponent(
    JSON.stringify({
      email: s.email,
      name: s.name,
      role: s.role,
      suspended: !!getSuspensions()[s.email] || s.email === "suspended@choque.dev",
    }),
  );
  document.cookie = `choque_session=${payload}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export const saveSession = (s: Session) => {
  write(KEYS.session, s);
  syncSessionCookie(s);
};

export const refreshSessionCookie = () => syncSessionCookie(getSession());

export const clearSession = () => {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.session);
  syncSessionCookie(null);
};

/* ——— Profile ——— */
export const getProfile = () => read<Profile | null>(KEYS.profile, null);
export const saveProfile = (p: Profile) => write(KEYS.profile, p);

/** Code-of-conduct acknowledgment (first sign-in, required once) */
export const getGuidelinesAcked = () => read<boolean>(`${PREFIX}guidelines-ack`, false);
export const setGuidelinesAcked = (v: boolean) => write(`${PREFIX}guidelines-ack`, v);

/* ——— Onboarding completion flag ——— */
export const getOnboarded = () => read<boolean>(KEYS.onboarding, false);
export const setOnboarded = (v: boolean) => write(KEYS.onboarding, v);

/* ——— Notebook (private training log) ——— */
export const getNotebook = () => read<NotebookEntry[]>(KEYS.notebook, []);
export const setNotebook = (entries: NotebookEntry[]) => write(KEYS.notebook, entries);

/* ——— Open-mat RSVPs ——— */
export const getRsvps = () => read<string[]>(KEYS.rsvps, []);
export const setRsvps = (ids: string[]) => write(KEYS.rsvps, ids);

/* ——— Roll requests sent to partners ——— */
export interface RollRequest {
  id: string;
  partnerSlug: string;
  message: string;
  at: string;
}
export const getRequests = () => read<RollRequest[]>(KEYS.requests, []);
export const addRequest = (r: RollRequest) => write(KEYS.requests, [...getRequests(), r]);

/* ——— Saved gyms ——— */
export const getSavedGyms = () => read<string[]>(KEYS.savedGyms, []);
export const setSavedGyms = (ids: string[]) => write(KEYS.savedGyms, ids);

/* ——— In-app activity events (demo "analytics table") ——— */
export const getEvents = () => read<AppEvent[]>(KEYS.events, []);
export const addEvent = (e: AppEvent) =>
  write(KEYS.events, [e, ...getEvents()].slice(0, 100));

/* ——— Community submissions (gym suggestions / open-mat submissions) ——— */
export const getSubmissions = () => read<Submission[]>(KEYS.submissions, []);
export const setSubmissions = (s: Submission[]) => write(KEYS.submissions, s);

/* ——— Demo suspension map (email -> suspended) ——— */
export const getSuspensions = () => read<Record<string, boolean>>(KEYS.suspensions, {});
export const setSuspensions = (m: Record<string, boolean>) => write(KEYS.suspensions, m);

/* ——— Demo role overrides applied by admins (email -> role) ——— */
export const getRoleOverrides = () => read<Record<string, AppRole>>(KEYS.roles, {});
export const setRoleOverrides = (m: Record<string, AppRole>) => write(KEYS.roles, m);

/* ——— Notebook collections (folders) ——— */
export const getCollections = () => read<Collection[]>(KEYS.collections, []);
export const setCollections = (c: Collection[]) => write(KEYS.collections, c);

/* ——— Connections (mutual accept) ——— */
export const getConnections = () => read<Connection[]>(KEYS.connections, []);
export const setConnections = (c: Connection[]) => write(KEYS.connections, c);

/* ——— Reports queue ——— */
export const getReports = () => read<Report[]>(KEYS.reports, []);
export const setReports = (r: Report[]) => write(KEYS.reports, r);

/* ——— Blocked practitioners (slugs) ——— */
export const getBlocks = () => read<string[]>(KEYS.blocks, []);
export const setBlocks = (b: string[]) => write(KEYS.blocks, b);

/* ——— Offline write queue: notebook saves that failed while offline ——— */
export interface QueuedWrite { id: string; at: string; entry: unknown }
export const getOutbox = () => read<QueuedWrite[]>(KEYS.outbox, []);
export const setOutbox = (q: QueuedWrite[]) => write(KEYS.outbox, q);

/* ——— Locale preference ——— */
export const getLocale = () => read<string>(KEYS.locale, "en");
export const setLocale = (l: string) => write(KEYS.locale, l);

/** Waitlist signups: [{id, city, email, at}] */
export interface WaitlistEntry { id: string; city: string; email: string; at: string }
export const getWaitlist = () => read<WaitlistEntry[]>(KEYS.waitlist, []);
export const setWaitlist = (w: WaitlistEntry[]) => write(KEYS.waitlist, w);

/* ——— Gym ownership claims + approved ownership (email -> gym ids) ——— */
export const getClaims = () => read<GymClaim[]>(KEYS.claims, []);
export const setClaims = (c: GymClaim[]) => write(KEYS.claims, c);
export const getOwnedGyms = () => read<Record<string, string[]>>(KEYS.ownedGyms, {});
export const setOwnedGyms = (m: Record<string, string[]>) => write(KEYS.ownedGyms, m);

/* ——— Full demo reset ——— */
export function resetAll() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}

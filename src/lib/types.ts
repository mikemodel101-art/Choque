/*
 * lib/types.ts — CHOQUE domain models.
 * Why: a single source of truth for the shapes of gyms, partners, open mats,
 * and notebook entries. The demo dataset (lib/data.ts), the async data layer
 * (lib/api.ts), and every page all import these, so refactors stay type-safe.
 */

export type Discipline = "bjj" | "nogi" | "judo" | "wrestling" | "mma" | "striking";

export const DISCIPLINES: { id: Discipline; label: string; short: string }[] = [
  { id: "bjj", label: "Brazilian Jiu-Jitsu", short: "BJJ" },
  { id: "nogi", label: "No-Gi Grappling", short: "No-Gi" },
  { id: "judo", label: "Judo", short: "Judo" },
  { id: "wrestling", label: "Wrestling", short: "Wrestling" },
  { id: "mma", label: "MMA", short: "MMA" },
  { id: "striking", label: "Muay Thai & Boxing", short: "Striking" },
];

export function disciplineLabel(id: Discipline) {
  return DISCIPLINES.find((d) => d.id === id)?.label ?? id;
}

export function disciplineShort(id: Discipline) {
  return DISCIPLINES.find((d) => d.id === id)?.short ?? id;
}

export interface ScheduleSlot {
  day: string; // "Mon"
  time: string; // "18:00"
  label: string; // "Competition class"
  discipline: Discipline;
  openMat?: boolean;
}

export interface Gym {
  id: string;
  slug: string;
  name: string;
  city: string;
  /** Sub-city area used by the directory filters (spec 5.1). */
  neighborhood?: string;
  state: string;
  address: string;
  /** Does this academy host at least one open mat? (filter) */
  hasOpenMat?: boolean;
  /** Are drop-in visitors welcome? (filter) */
  dropInsWelcome?: boolean;
  /** Admin-set badge for academies with a clear, current drop-in policy. */
  visitorFriendly?: boolean;
  disciplines: Discipline[];
  rating: number;
  reviews: number;
  priceFrom: number; // monthly USD
  dropIn: number; // day pass USD
  headCoach: string;
  coaches: string[];
  /** Public contact links shown on the gym profile. */
  website?: string;
  instagram?: string;
  email?: string;
  image: string;
  gallery: string[];
  about: string;
  amenities: string[];
  womenOnly: boolean;
  kids: boolean;
  verified: boolean;
  affiliate: boolean; // Shoyoroll-affiliated academy
  schedule: ScheduleSlot[];
}

export type TimeOfDay = "Morning" | "Midday" | "Evening";
export type LookingFor = "Open mat" | "Drilling" | "Comp prep" | "Beginner friendly";

export interface Partner {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  homeGymId: string;
  disciplines: Discipline[];
  primaryDiscipline: Discipline;
  rank: string; // "BJJ purple belt", "Judo nidan"
  beltColor?: string; // hex for BJJ belt ring
  stripes?: number;
  yearsTraining: number;
  weightKg: number;
  availability: TimeOfDay[];
  weekdays: string[]; // "Mon"
  lookingFor: LookingFor[];
  bio: string;
  lastActiveDays: number;
  verified: boolean;
}

export type MatLevel = "All levels" | "Beginner" | "Competition";

export interface OpenMat {
  id: string;
  gymId: string;
  title: string;
  discipline: Discipline;
  weekday: number; // 0-6
  weekOffset: 0 | 1; // resolved to a real date in lib/api.ts (always upcoming)
  start: string; // "09:00"
  end: string;
  level: MatLevel;
  fee: number;
  capacity: number;
  attendeesBase: number;
  womenOnly: boolean;
  /** Who's running the session and how to reach them. */
  hostName: string;
  hostContact?: string;
  /** Gear/intensity requirements visitors must know beforehand. */
  visitorRequirements: string;
  notes: string;
}

/** Resolved open mat with a concrete date + RSVP overlay applied. */
export interface OpenMatResolved extends OpenMat {
  date: string; // YYYY-MM-DD
  gym: Gym;
  attendees: number;
  rsvped: boolean;
  full: boolean;
}

export type SessionType = "class" | "open-mat" | "drilling" | "competition";

/** A YouTube reference attached to a note (privacy-enhanced embed). */
export interface NoteLink {
  id: string;
  url: string;
  youtubeId: string;
  title: string;
  startSeconds?: number;
}

export interface NotebookEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: SessionType;
  title: string;
  techniques: string[];
  rounds: number;
  minutes: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  worked: string; // one thing that worked
  fix: string; // one thing to fix
  notes: string; // markdown body
  /** Guard position this note belongs to ("half guard", "standing"). */
  position?: string;
  /** Topic bucket ("sweeps", "escapes", "counters"). */
  topic?: string;
  /** Collection (folder) ids this note belongs to. */
  collectionIds?: string[];
  /** Pinned notes float to the top of the list. */
  pinned?: boolean;
  links?: NoteLink[];
  createdAt: string;
  updatedAt: string;
}

/** A user-defined folder for notes. */
export interface Collection {
  id: string;
  name: string;
  sortOrder: number;
}

/* ——— Connections (mutual acceptance, contact shared on accept) ——— */
export type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";
export type ConnectionDirection = "outgoing" | "incoming";

export interface ContactCard {
  /** Only ever revealed to an accepted connection. */
  email?: string;
  phone?: string;
  instagram?: string;
  preferred?: string;
}

export interface Connection {
  id: string;
  partnerSlug: string;
  partnerName: string;
  direction: ConnectionDirection;
  status: ConnectionStatus;
  message: string;
  createdAt: string;
  respondedAt?: string;
  /** Populated only once status === 'accepted'. */
  contact?: ContactCard;
}

/* ——— Reports (trust & safety) ——— */
export interface Report {
  id: string;
  targetType: "profile" | "gym" | "open_mat";
  targetId: string;
  targetLabel: string;
  reason: string;
  details: string;
  reporter: string;
  status: "open" | "reviewing" | "actioned" | "dismissed";
  createdAt: string;
  handledBy?: string;
  resolution?: string;
}

export type FieldVisibility = "public" | "connections" | "private";

export interface Profile {
  name: string;
  email: string;
  city: string;
  homeGymId: string | null;
  disciplines: Discipline[];
  rank: string;
  beltColor?: string;
  bio: string;
  lookingFor: LookingFor[];
  joinedAt: string;
  /** Times of day the member usually trains. */
  availability?: string[];
  /** Per-field privacy map (mirrors profiles.visibility jsonb in Supabase). */
  visibility?: Record<string, FieldVisibility>;
  /** Data-URL avatar (client-side cropped + compressed in the demo build). */
  avatarUrl?: string;
}

export interface AppEvent {
  id: string;
  type: string;
  detail: string;
  at: string; // ISO timestamp
}

/* ——— Access control (mirrors supabase migration 00007) ——— */
export type AppRole = "member" | "owner" | "moderator" | "admin";

export interface GymClaim {
  id: string;
  gymId: string;
  gymName: string;
  gymSlug: string;
  email: string;
  name: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedBy?: string;
}

export type SubmissionKind = "gym" | "open_mat";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  kind: SubmissionKind;
  title: string;
  summary: string;
  payload: Record<string, string>;
  status: SubmissionStatus;
  submittedBy: string; // email
  submittedByName: string;
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string;
}

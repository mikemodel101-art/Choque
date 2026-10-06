/*
 * lib/demo-accounts.ts — one-click demo role accounts.
 * Why: reviewers need to experience the full section-4A access matrix without
 * a database. These five accounts are shown on the sign-in screen as
 * autofil buttons; signing in with their email assigns the matching role so
 * staff surfaces, suspension banners, and permission gates all become
 * testable. Password for every demo account is DEMO_PASSWORD.
 */
import type { AppRole } from "./types";

export const DEMO_PASSWORD = "choque-demo";

export interface DemoAccount {
  role: AppRole;
  email: string;
  name: string;
  label: string;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "member",
    email: "member@choque.dev",
    name: "Riley Tanaka",
    label: "Member",
    blurb: "Browse, request rolls, submit gyms & open mats, keep a notebook.",
  },
  {
    role: "owner",
    email: "owner@choque.dev",
    name: "Sam Ortega",
    label: "Gym owner",
    blurb: "Everything a member does, plus edit their claimed academy listing.",
  },
  {
    role: "moderator",
    email: "moderator@choque.dev",
    name: "Jordan Fields",
    label: "Moderator",
    blurb: "Review queue: approve submissions, handle reports, suspend members.",
  },
  {
    role: "admin",
    email: "admin@choque.dev",
    name: "Alex Yamada",
    label: "Admin",
    blurb: "Full access: roles, unsuspend, audit log, full analytics.",
  },
  {
    role: "member",
    email: "suspended@choque.dev",
    name: "Lee Mercer",
    label: "Suspended member",
    blurb: "Can sign in and browse — cannot post, submit, or request.",
  },
];

export const ACCOUNT_BY_EMAIL = new Map(DEMO_ACCOUNTS.map((a) => [a.email, a]));

/** Lookup across the built-in registry AND accounts an admin added at runtime. */
export function lookupAccount(email: string): DemoAccount | undefined {
  return ACCOUNT_BY_EMAIL.get(email);
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "member": return "Member";
    case "owner": return "Gym owner";
    case "moderator": return "Moderator";
    case "admin": return "Admin";
    default: return role;
  }
}

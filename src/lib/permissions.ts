/*
 * lib/permissions.ts — client-side capability resolver (mirror of 4A).
 * Why: UI gating mirrors the SQL rules from migration 00007 so the demo app
 * shows exactly what each role can do. IMPORTANT: these helpers only hide or
 * disable controls; the demo API (lib/api.ts) re-checks every rule before
 * mutating, just as RLS would — "UI hiding is never security".
 */
import type { Session } from "./storage";
import type { AppRole } from "./types";

export interface Capabilities {
  role: AppRole;
  suspended: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  canSubmitGym: boolean;
  canSubmitMat: boolean;
  canConnect: boolean;
  canReport: boolean;
  canPost: boolean; // any community content
  canUseNotebook: boolean; // notebook stays available (private data)
  canApprove: boolean;
  canSuspend: boolean;
  canUnsuspend: boolean;
  canViewAudit: boolean;
  canViewFullAnalytics: boolean;
  canViewSummaryAnalytics: boolean;
}

export function caps(session: Session | null, opts?: { suspended?: boolean }): Capabilities {
  const role: AppRole = session?.role ?? "member";
  const suspended = opts?.suspended ?? false;
  const signedIn = !!session;
  const isStaff = role === "moderator" || role === "admin";
  const isAdmin = role === "admin";

  return {
    role,
    suspended,
    isStaff: isStaff && !suspended,
    isAdmin: isAdmin && !suspended,
    isOwner: role === "owner",
    // submissions/posting: active (non-suspended), signed-in members+
    canSubmitGym: signedIn && !suspended,
    canSubmitMat: signedIn && !suspended,
    canConnect: signedIn && !suspended,
    canReport: signedIn && !suspended,
    canPost: signedIn && !suspended,
    canUseNotebook: signedIn, // survives suspension (it's private)
    canApprove: isStaff && !suspended,
    canSuspend: isStaff && !suspended,
    canUnsuspend: isAdmin && !suspended,
    canViewAudit: isAdmin && !suspended,
    canViewFullAnalytics: isAdmin && !suspended,
    canViewSummaryAnalytics: isStaff && !suspended,
  };
}

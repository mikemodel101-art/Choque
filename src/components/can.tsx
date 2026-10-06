/*
 * components/can.tsx — role-aware UI primitives.
 * Why: nav items and controls must change by role (moderators see a reduced
 * admin menu, admins see everything). <Can> and useRole() centralise that so
 * no screen hand-rolls role checks. These only SHOW or HIDE: the server
 * re-validates with requireRole() and RLS, because hidden is not secure.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSession } from "@/components/providers";
import { caps, type Capabilities } from "@/lib/permissions";
import type { AppRole } from "@/lib/types";
import * as api from "@/lib/api";

export interface RoleInfo extends Capabilities {
  signedIn: boolean;
  email: string | null;
  name: string | null;
  loading: boolean;
}

/** The single source of truth for "what may this user do?" in the client. */
export function useRole(): RoleInfo {
  const { session, loading } = useSession();
  const { data: suspended, isLoading: suspLoading } = useQuery({
    queryKey: ["me", "suspended", session?.email],
    queryFn: () => Promise.resolve(api.isCurrentUserSuspended()),
    enabled: !!session,
  });

  const c = caps(session ?? null, { suspended: !!suspended });
  return {
    ...c,
    signedIn: !!session,
    email: session?.email ?? null,
    name: session?.name ?? null,
    loading: loading || (!!session && suspLoading),
  };
}

type Capability = keyof Capabilities;

/**
 * Conditionally render children.
 *   <Can role="admin">…</Can>
 *   <Can role={["moderator", "admin"]}>…</Can>
 *   <Can capability="canUnsuspend">…</Can>
 * `fallback` renders when the check fails (default: nothing).
 */
export function Can({
  role,
  capability,
  children,
  fallback = null,
}: {
  role?: AppRole | AppRole[];
  capability?: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const info = useRole();
  if (info.loading) return null;

  let ok = true;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    ok = info.signedIn && allowed.includes(info.role);
    // Suspension never grants privileged UI.
    if (info.suspended && (allowed.includes("admin") || allowed.includes("moderator"))) ok = false;
  }

  if (ok && capability) {
    ok = Boolean(info[capability]);
  }

  return <>{ok ? children : fallback}</>;
}

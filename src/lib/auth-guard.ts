/*
 * lib/auth-guard.ts — server-side role enforcement.
 * Why: middleware is a convenience redirect; this is the real gate. Every
 * admin route handler and server action calls requireRole([...]) as its first
 * statement so a forged cookie or a direct API call still fails. Mirrors the
 * SQL helpers is_admin() / is_staff() / is_suspended() exactly.
 */
import "server-only";
import { cookies } from "next/headers";
import type { AppRole } from "./types";

const SESSION_COOKIE = "choque_session";

export interface ServerSession {
  email: string;
  name?: string;
  role: AppRole;
  suspended: boolean;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Read the session cookie on the server. Returns null when signed out. */
export async function getServerSession(): Promise<ServerSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ServerSession>;
    if (!parsed.email) return null;
    return {
      email: parsed.email,
      name: parsed.name,
      role: (parsed.role ?? "member") as AppRole,
      suspended: !!parsed.suspended,
    };
  } catch {
    return null;
  }
}

/**
 * Assert the caller holds one of `allowed`. Throws AuthError (401/403)
 * otherwise. Call at the TOP of every privileged handler/action.
 *
 *   const session = await requireRole(["admin"]);
 */
export async function requireRole(allowed: AppRole[]): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) throw new AuthError("You must be signed in.", 401);
  if (!allowed.includes(session.role)) {
    throw new AuthError(
      `This action requires: ${allowed.join(" or ")}. Your role: ${session.role}.`,
      403,
    );
  }
  return session;
}

/** Assert the caller can write content (signed in and not suspended). */
export async function requireActiveMember(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) throw new AuthError("You must be signed in.", 401);
  if (session.suspended) {
    throw new AuthError("Your account is suspended; posting is disabled.", 403);
  }
  return session;
}

/** Hash an IP for the audit log — we never persist raw addresses. */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${ip}::choque`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

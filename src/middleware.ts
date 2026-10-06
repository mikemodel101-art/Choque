/*
 * middleware.ts — route gating at the edge.
 * Why: the access matrix must be enforced before a protected page renders.
 * /(app)/* requires a signed-in member; /admin/* requires staff; the admin
 * sub-sections for users, audit and full analytics require an admin. Denied
 * visitors are redirected with a friendly `message` and a `returnTo` so they
 * land back where they intended after signing in.
 *
 * NOTE: this is the first gate, never the only one. Every admin route handler
 * and server action independently calls requireRole() (see lib/auth-guard.ts),
 * because a cookie can be forged but a server-side check cannot be skipped.
 */
import { NextResponse, type NextRequest } from "next/server";

/** Cookie written by the demo session layer (mirrors a Supabase auth cookie). */
const SESSION_COOKIE = "choque_session";

type Role = "member" | "owner" | "moderator" | "admin";

interface SessionCookie {
  email: string;
  role: Role;
  suspended?: boolean;
}

function readSession(req: NextRequest): SessionCookie | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionCookie;
  } catch {
    return null;
  }
}

/** Admin-only areas inside /admin. Everything else under /admin is staff-level. */
const ADMIN_ONLY = ["/admin/users", "/admin/audit", "/admin/analytics"];

const APP_PREFIXES = ["/gyms", "/partners", "/open-mats", "/notebook", "/profile", "/onboarding"];

function deny(req: NextRequest, to: string, message: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  url.searchParams.set("message", message);
  url.searchParams.set("returnTo", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = readSession(req);
  const role = session?.role;
  const isStaff = role === "moderator" || role === "admin";
  const isAdmin = role === "admin";

  // ——— /admin/* : staff only, with admin-only subsections ———
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return deny(req, "/sign-in", "Sign in with a staff account to open admin tools.");
    }
    if (!isStaff) {
      return deny(req, "/gyms", "Admin tools are available to moderators and admins only.");
    }
    if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && !isAdmin) {
      return deny(req, "/admin", "That section is restricted to admins.");
    }
    return NextResponse.next();
  }

  // ——— /(app)/* : any signed-in member ———
  if (APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!session) {
      return deny(req, "/sign-in", "Sign in to continue — your place is saved.");
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/gyms/:path*",
    "/partners/:path*",
    "/open-mats/:path*",
    "/notebook/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
  ],
};

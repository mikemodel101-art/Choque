/*
 * app/api/admin/users/route.ts — privileged route handler.
 * Why: demonstrates the mandatory server-side pattern — requireRole() runs as
 * the FIRST statement, before any work, so a forged cookie or a direct curl
 * to this endpoint is rejected with 401/403 regardless of what the UI shows.
 * Mirrors what the Supabase build does with RLS + service-role checks.
 */
import { AuthError, requireRole, hashIp } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["admin"]);
    return Response.json({
      ok: true,
      actor: session.email,
      role: session.role,
      note: "Admin-only endpoint reached. In the Supabase build this would list auth.users joined to profiles.",
    });
  } catch (e) {
    const err = e as AuthError;
    return Response.json({ ok: false, error: err.message }, { status: err.status ?? 403 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      role?: string;
      suspended?: boolean;
      reason?: string;
    };

    if (!body.email) {
      return Response.json({ ok: false, error: "email is required" }, { status: 400 });
    }
    if (!body.reason || body.reason.trim().length < 5) {
      return Response.json(
        { ok: false, error: "A reason of at least 5 characters is required and will be logged." },
        { status: 400 },
      );
    }

    const ipHash = await hashIp(req.headers.get("x-forwarded-for"));

    // Audit record shape written by public.write_audit() in the SQL build.
    const audit = {
      actor: session.email,
      action: body.role ? "role_change" : "suspension",
      entity: "profiles",
      entity_id: body.email,
      diff: body.role ? { role: [null, body.role] } : { is_suspended: [null, body.suspended] },
      reason: body.reason.trim(),
      ip_hash: ipHash,
      at: new Date().toISOString(),
    };

    return Response.json({ ok: true, audit });
  } catch (e) {
    const err = e as AuthError;
    return Response.json({ ok: false, error: err.message }, { status: err.status ?? 403 });
  }
}

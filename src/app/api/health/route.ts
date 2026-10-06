/*
 * app/api/health/route.ts — liveness probe.
 * Why: deployment platforms (and this sandbox) poll /api/health during boot.
 * The product runs in no-database demo mode, so health = server renders fine,
 * which is all this route needs to confirm.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, mode: "demo", ts: Date.now() });
}

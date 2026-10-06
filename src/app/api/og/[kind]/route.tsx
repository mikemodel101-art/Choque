/*
 * app/api/og/[kind]/route.tsx — auto-generated OG share images.
 * Why: smart share cards — every gym and open-mat link unfurled in a chat
 * should show a branded image with the actual listing details instead of a
 * generic app screenshot. Rendered at request time with ImageResponse; safe
 * to cache aggressively since directory data changes rarely.
 */
import { ImageResponse } from "next/og";
import { GYM_BY_SLUG, OPEN_MATS, GYM_BY_ID } from "@/lib/data";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

function Card({
  eyebrow, title, subtitle, footer,
}: { eyebrow: string; title: string; subtitle: string; footer: string }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "linear-gradient(135deg, #0C0A09 0%, #1C1917 100%)",
        color: "#FAFAF9",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      {/* clashing-squares mark */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FAFAF9" }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#B91C1C", marginLeft: -20 }} />
        </div>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>CHOQUE</span>
      </div>

      <div>
        <p style={{ margin: 0, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: "#EF4444" }}>
          {eyebrow}
        </p>
        <h1 style={{ margin: "16px 0 0", fontSize: 68, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
          {title}
        </h1>
        <p style={{ margin: "18px 0 0", fontSize: 30, color: "#A8A29E" }}>{subtitle}</p>
      </div>

      <p style={{ margin: 0, fontSize: 26, color: "#78716C" }}>{footer}</p>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";

  if (kind === "gym") {
    const gym = GYM_BY_SLUG.get(slug);
    if (!gym) return new Response("Not found", { status: 404 });
    return new ImageResponse(
      <Card
        eyebrow="Train at"
        title={gym.name}
        subtitle={`${gym.neighborhood ?? gym.city}, ${gym.state} · ${gym.rating.toFixed(1)}★ · from $${gym.priceFrom}/mo`}
        footer={`Drop-ins ${gym.dropInsWelcome ? `welcome, $${gym.dropIn}` : "by arrangement"} · choque.app`}
      />,
      { ...SIZE, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate" } },
    );
  }

  if (kind === "mat") {
    const mat = OPEN_MATS.find((m) => m.id === slug);
    if (!mat) return new Response("Not found", { status: 404 });
    const gym = GYM_BY_ID.get(mat.gymId);
    return new ImageResponse(
      <Card
        eyebrow="Open mat"
        title={mat.title}
        subtitle={`${gym?.name ?? ""} · ${gym?.city ?? ""} · ${mat.start}–${mat.end}`}
        footer={`${mat.level} · ${mat.fee === 0 ? "Free" : `$${mat.fee}`} · choque.app`}
      />,
      { ...SIZE, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate" } },
    );
  }

  return new Response("Unknown kind", { status: 400 });
}

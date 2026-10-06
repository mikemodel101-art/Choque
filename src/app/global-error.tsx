/*
 * app/global-error.tsx — last-resort boundary (replaces the root layout).
 * Why: if the root layout itself throws, Next renders this instead. It must
 * include <html>/<body> and cannot rely on providers or fonts.
 */
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAFAF9", color: "#1C1917", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#B91C1C" }}>
            CHOQUE
          </p>
          <h1 style={{ fontSize: 24, margin: "24px 0 8px", letterSpacing: "-.02em" }}>
            The app failed to start
          </h1>
          <p style={{ color: "#78716C", fontSize: 15, lineHeight: 1.6 }}>
            Reload the page. If this keeps happening, clear the site data for choque.app.
          </p>
          {error.digest && (
            <p style={{ color: "#A8A29E", fontSize: 12, fontFamily: "monospace" }}>ref: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24, background: "#B91C1C", color: "#fff", border: 0,
              padding: "12px 22px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}

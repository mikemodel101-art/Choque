/*
 * app/error.tsx — route-level error boundary.
 * Why: a thrown render error should never show a blank screen. This catches
 * it, keeps the brand, offers a retry that re-runs the segment, and exposes
 * the digest so a support conversation has something to reference.
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where the error reporter would be notified.
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16 text-center">
      <div className="mx-auto"><Logo /></div>
      <p className="mt-10 text-3xl font-bold tracking-[-0.04em] text-accent">500</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
        An unexpected error broke this screen. Your data is safe — nothing was lost.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted/70">reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}><RotateCcw className="size-4" /> Try again</Button>
        <Link href="/gyms"><Button variant="secondary">Back to CHOQUE</Button></Link>
      </div>
    </main>
  );
}

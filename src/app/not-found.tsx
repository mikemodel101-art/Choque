/*
 * app/not-found.tsx — 404 page.
 * Why: a missing page should still feel like CHOQUE and offer a way back to
 * the three things people are usually looking for.
 */
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16 text-center">
      <div className="mx-auto"><Logo /></div>
      <p className="mt-10 text-3xl font-bold tracking-[-0.04em] text-accent">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">This page tapped out</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
        The link you followed doesn&apos;t exist — or the listing was removed. No harm done.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/gyms"><Button>Find a gym</Button></Link>
        <Link href="/open-mats"><Button variant="secondary">Browse open mats</Button></Link>
        <Link href="/"><Button variant="ghost">Home</Button></Link>
      </div>
    </main>
  );
}

/*
 * app/offline/page.tsx — PWA offline fallback.
 * Why: the service worker serves this when a navigation fails with no
 * network. It reassures the member that queued notebook writes are safe and
 * will sync, and offers a retry.
 */
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16 text-center">
      <div className="mx-auto"><Logo /></div>
      <div className="mx-auto mt-10 flex size-14 items-center justify-center rounded-full bg-accent-soft">
        <CloudOff className="size-6 text-accent" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">You&apos;re offline</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
        CHOQUE needs a connection for the directory, but your notebook keeps working — anything you
        write is queued in this browser and syncs the moment you&apos;re back.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/notebook"><Button>Open my notebook</Button></Link>
        <Link href="/gyms"><Button variant="secondary">Try again</Button></Link>
      </div>
    </main>
  );
}

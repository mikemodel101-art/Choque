/*
 * app/legal/layout.tsx — shared chrome for policy pages.
 * Why: Terms, Privacy and Community Guidelines share one calm reading layout
 * (70ch measure, generous spacing) and a cross-link footer, so the client's
 * lawyer can review the content without fighting the design.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";

const PAGES = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/guidelines", label: "Community Guidelines" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="CHOQUE home"><Logo /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <article
          className="measure space-y-4 text-[15px] leading-relaxed text-muted
                     [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-[-0.03em] [&_h1]:text-foreground
                     [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground
                     [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground
                     [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4"
        >
          {children}
        </article>

        <nav className="mt-14 flex flex-wrap gap-2 border-t border-border pt-6" aria-label="Legal pages">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-sm border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-muted/60 hover:text-foreground"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

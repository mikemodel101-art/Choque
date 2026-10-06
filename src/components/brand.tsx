/*
 * components/brand.tsx — CHOQUE logo & wordmark.
 * Why: the brand mark (two clashing squares — "choque" means clash in
 * Portuguese) appears in the nav, auth pages, and footer; one asset keeps the
 * geometry and accent tints consistent everywhere.
 */
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-7", className)}>
      <rect x="3" y="7" width="18" height="18" rx="5" className="fill-foreground" />
      <rect x="13" y="7" width="18" height="18" rx="5" className="fill-accent mix-blend-multiply dark:mix-blend-screen" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-bold tracking-[-0.03em] leading-none">
        CHOQUE
        <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          by Shoyoroll
        </span>
      </span>
    </span>
  );
}

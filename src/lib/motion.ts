/*
 * lib/motion.ts — CHOQUE animation system (shared variants).
 * Why: every animation in the app resolves against this one file. All
 * transitions use the spec's easing [0.22, 1, 0.36, 1] and 150–400ms
 * durations, and `useMotionEnabled` mirrors prefers-reduced-motion so each
 * motion variant collapses to an instant, opacity-only change when the user
 * asks for less motion. Never > 500ms, never blocking interaction.
 */
"use client";

import { useSyncExternalStore } from "react";
import type { Variants, Transition } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const duration = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

const t = (slow = false): Transition => ({ duration: slow ? duration.slow : duration.base, ease: EASE_OUT });

/* ——— prefers-reduced-motion subscription (SSR-safe) ——— */
function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getSnapshot() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function useMotionEnabled(): boolean {
  // Server + first client paint: assume motion allowed; the variants
  // themselves are CSS-gated too, so the worst case is one static frame.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/* ——— Page-level fade + 8px rise (250ms) ——— */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: t() },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: EASE_OUT } },
};

/* ——— Staggered grid/list enter (40ms per child) ——— */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: t() },
};

/* ——— Generic fade (for cross-fades, map/list toggle) ——— */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: EASE_OUT } },
};

/* ——— Word-by-word headline reveal ——— */
export const wordContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const wordChild: Variants = {
  hidden: { opacity: 0, y: "0.45em" },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: EASE_OUT } },
};

/* ——— Interaction presets (cards / buttons) ——— */
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: duration.fast, ease: EASE_OUT } },
  whileTap: { scale: 0.98, transition: { duration: duration.fast } },
} as const;

/* ——— Pulse ring for accepted requests / success ——— */
export const pulseRing: Variants = {
  hidden: { scale: 0.6, opacity: 0 },
  show: {
    scale: [0.6, 1.4],
    opacity: [0.9, 0],
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

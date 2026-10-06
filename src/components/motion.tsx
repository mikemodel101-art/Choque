/*
 * components/motion.tsx — animated layout primitives.
 * Why: the animation spec calls for staggered fades on every list/grid, page
 * fade+slide transitions, and AnimatePresence exit support. Wrapping that in
 * two components keeps each page one tag deep, and every variant collapses to
 * instant changes under prefers-reduced-motion via lib/motion.ts.
 */
"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeVariants, pageVariants, staggerContainer, staggerItem, useMotionEnabled } from "@/lib/motion";

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const enabled = useMotionEnabled();
  if (!enabled) return <>{children}</>;
  return (
    <motion.div className={className} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

/**
 * Staggered enter + exit + layout shifts for result grids. Children must
 * supply a `key`; each child should be wrapped in <AnimatedItem>.
 */
export function AnimatedGrid({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <LayoutGroup id={id}>
      <motion.div className={className} variants={staggerContainer} initial="hidden" animate="show">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}

export function AnimatedItem({ children, layoutKey }: { children: ReactNode; layoutKey: string }) {
  return (
    <motion.div
      layout
      key={layoutKey}
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/** Cross-fade container — used by the gyms map/list toggle. */
export function CrossFade({ children, stateKey, className }: { children: ReactNode; stateKey: string; className?: string }) {
  const enabled = useMotionEnabled();
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <AnimatePresence mode="wait">
      <motion.div key={stateKey} className={className} variants={fadeVariants} initial="initial" animate="animate" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

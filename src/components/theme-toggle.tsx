/*
 * components/theme-toggle.tsx — light/dark switch with icon morph.
 * Why: per the animation spec the toggle itself should feel considered — the
 * sun/moon cross-rotates and scales through a 180ms framer transition while
 * the page colors ride the 200ms body transition defined in globals.
 * Mounted-guard avoids hydration mismatch with next-themes.
 */
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useMotionEnabled, EASE_OUT } from "@/lib/motion";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const enabled = useMotionEnabled();
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted ? (
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={enabled ? { rotate: -90, opacity: 0, scale: 0.7 } : false}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={enabled ? { rotate: 90, opacity: 0, scale: 0.7 } : {}}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="inline-flex"
          >
            {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </motion.span>
        ) : (
          <span className="size-[18px]" />
        )}
      </AnimatePresence>
    </button>
  );
}

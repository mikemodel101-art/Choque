/*
 * components/connect-button.tsx — the connection-request morph.
 * Why: animation spec — "Connect" → spinner → "Requested" with a drawn check,
 * and a calm pulse ring when the state first becomes accepted. Implementing it
 * once keeps the pattern identical on partner profiles and (later) search
 * result cards. The button never blocks interaction: width animates, the
 * request fires optimistically, and a failure rolls back with a toast.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Handshake, Loader2 } from "lucide-react";
import { EASE_OUT, useMotionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ConnectState = "idle" | "loading" | "requested" | "connected";

export function ConnectButton({
  state,
  onRequest,
  className,
}: {
  state: ConnectState;
  onRequest?: () => void | Promise<unknown>;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const [pulse, setPulse] = useState(false);
  const prev = useRef(state);

  // Fire the acceptance pulse-ring exactly once on transition to connected.
  useEffect(() => {
    if (prev.current !== "connected" && state === "connected") {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    prev.current = state;
  }, [state]);

  const disabled = state !== "idle";
  const content =
    state === "idle"
      ? { icon: Handshake, label: "Request to roll" }
      : state === "loading"
        ? { icon: Loader2, label: "Sending…" }
        : state === "requested"
          ? { icon: Check, label: "Requested" }
          : { icon: Check, label: "Connected" };

  const Icon = content.icon;

  return (
    <motion.button
      layout
      onClick={() => state === "idle" && onRequest?.()}
      disabled={disabled}
      aria-live="polite"
      className={cn(
        "relative inline-flex h-11 items-center justify-center gap-2 overflow-visible rounded-sm px-5 text-sm font-medium transition-colors duration-200 cursor-pointer lg:h-10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default",
        state === "idle" && "bg-accent text-white shadow-1 hover:bg-accent-strong active:scale-[0.98]",
        state === "loading" && "bg-accent/80 text-white",
        (state === "requested" || state === "connected") &&
          "border border-border bg-surface text-foreground shadow-1",
        className,
      )}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      {/* Acceptance pulse ring (no confetti — calm and quiet) */}
      <AnimatePresence>
        {pulse && enabled && (
          <motion.span
            key="ring"
            className="pointer-events-none absolute inset-0 rounded-sm border-2 border-accent"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={enabled ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
          className="inline-flex items-center gap-2"
        >
          {state === "requested" || state === "connected" ? (
            <motion.svg
              viewBox="0 0 24 24"
              className="size-4 text-success"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <motion.path
                d="M20 6 9 17l-5-5"
                initial={enabled ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              />
            </motion.svg>
          ) : (
            <Icon className={cn("size-4", state === "loading" && "animate-spin")} aria-hidden />
          )}
          <span>{content.label}</span>
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

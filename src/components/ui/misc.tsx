/*
 * components/ui/misc.tsx — small shared pieces.
 * Why: skeleton loading states, separators, empty states, and the dropdown
 * menu pattern are used by almost every page; keeping them here avoids four
 * divergent implementations. The EmptyState is the antidote to dead screens —
 * every filtered list has a designed zero state with a recovery action.
 */
"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import type { ComponentProps, ComponentType, HTMLAttributes, ReactNode } from "react";
import { EASE_OUT, useMotionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ——— Skeleton ——— */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-sm", className)}
      aria-hidden
      {...props}
    />
  );
}

/* ——— Separator ——— */
export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("border-0 border-t border-border", className)} {...props} />;
}

/* ——— Empty state (subtle looping line-art illustration) ——— */
function EmptyArt() {
  const enabled = useMotionEnabled();
  const draw = enabled
    ? { pathLength: [0.15, 1, 0.15], opacity: [0.3, 0.9, 0.3] }
    : { pathLength: 1, opacity: 0.7 };
  return (
    <svg viewBox="0 0 200 120" className="h-24 w-40" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      {/* stacked mats */}
      <motion.rect x="30" y="78" width="140" height="10" rx="5" className="text-muted/50"
        animate={draw} transition={{ duration: 3.2, ease: EASE_OUT, repeat: Infinity }} />
      <motion.rect x="45" y="64" width="110" height="10" rx="5" className="text-muted/40"
        animate={draw} transition={{ duration: 3.2, ease: EASE_OUT, repeat: Infinity, delay: 0.25 }} />
      {/* round timer */}
      <motion.path d="M100 20 a16 16 0 1 1 -0.01 0" className="text-accent/70"
        animate={draw} transition={{ duration: 3.2, ease: EASE_OUT, repeat: Infinity, delay: 0.5 }} />
      <motion.path d="M100 28 v8 M100 36 h6" className="text-accent/70"
        animate={draw} transition={{ duration: 3.2, ease: EASE_OUT, repeat: Infinity, delay: 0.6 }} />
      {/* two clashing dashes */}
      <motion.path d="M70 46 l-8 -8 M130 46 l8 -8" className="text-muted/50"
        animate={draw} transition={{ duration: 3.2, ease: EASE_OUT, repeat: Infinity, delay: 0.7 }} />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <div className="text-muted">
        <EmptyArt />
      </div>
      <div className="-mt-2 flex size-11 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="size-5 text-accent" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ——— Dropdown menu (row actions) ——— */
export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

export function DropdownButton({ label = "Actions" }: { label?: string }) {
  return (
    <DropdownPrimitive.Trigger
      className="inline-flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={label}
    >
      <MoreHorizontal className="size-4" />
    </DropdownPrimitive.Trigger>
  );
}

export function DropdownContent({ className, children, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          "z-50 min-w-40 rounded-sm border border-border bg-surface p-1 shadow-2",
          "data-[state=open]:[animation:slide-down_140ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function DropdownItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none [&>svg]:size-4",
        "data-highlighted:bg-accent-soft data-highlighted:text-accent",
        "data-[variant=danger]:text-danger data-[variant=danger]:data-highlighted:bg-danger/10",
        className,
      )}
      {...props}
    />
  );
}

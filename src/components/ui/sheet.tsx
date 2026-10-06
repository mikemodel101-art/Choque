/*
 * components/ui/sheet.tsx — edge sheet (mobile nav, filters).
 * Why: filter panels and the mobile menu slide in from the edge instead of
 * using a center modal. Radix Dialog provides the accessibility; the 24px
 * radius and slide motion come from the design system.
 */
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  title,
  side = "right",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  side?: "right" | "bottom";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:[animation:fade-in_180ms_var(--ease-out-soft)]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col border-border bg-surface shadow-2",
          side === "right" &&
            "inset-y-0 right-0 h-dvh w-[min(24rem,90vw)] rounded-l-lg border-l data-[state=open]:[animation:slide-in-right_240ms_var(--ease-out-soft)]",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t data-[state=open]:[animation:slide-up_260ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/*
 * components/ui/dialog.tsx — modal dialog built on Radix.
 * Why: roll requests, notebook editing, and confirmations need an accessible
 * modal (focus trap, escape to close, labelledby). Radius 24px per the spec,
 * with subtle scale/fade motion that respects reduced-motion via CSS globals.
 */
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:[animation:fade-in_180ms_var(--ease-out-soft)] data-[state=closed]:[animation:fade-in_120ms_var(--ease-out-soft)_reverse]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2",
          "max-h-[85dvh] overflow-y-auto",
          "data-[state=open]:[animation:pop-in_220ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            )}
            {!description && (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

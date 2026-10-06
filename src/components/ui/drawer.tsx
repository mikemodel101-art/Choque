/*
 * components/ui/drawer.tsx — mobile bottom sheet (vaul).
 * Why: filter surfaces on mobile live in a bottom sheet that slides up with a
 * spring, dismisses on swipe-down, and blurs the backdrop — the exact mobile
 * pattern from the layout & animation specs. vaul gives us physics-correct
 * drag behavior that a plain dialog can't.
 */
"use client";

import { Drawer as DrawerPrimitive } from "vaul";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

export function DrawerContent({
  className,
  children,
  title,
  description,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-lg border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-2",
          className,
        )}
        {...props}
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted/40" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-3">
          <div>
            <DrawerPrimitive.Title className="text-base font-semibold tracking-tight">
              {title}
            </DrawerPrimitive.Title>
            {description ? (
              <DrawerPrimitive.Description className="mt-0.5 text-sm text-muted">
                {description}
              </DrawerPrimitive.Description>
            ) : (
              <DrawerPrimitive.Description className="sr-only">{title}</DrawerPrimitive.Description>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

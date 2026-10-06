/*
 * components/ui/select.tsx — native-feel styled select on Radix.
 * Why: filter bars need compact selects (city, sort, level) that remain
 * keyboardAccessible and consistent in both themes — a native select can't be
 * styled reliably, so Radix it is.
 */
"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex h-11 lg:h-10 items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3 text-sm shadow-1 cursor-pointer",
        "hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[placeholder]:text-muted",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-y-auto rounded-sm border border-border bg-surface p-1 shadow-2",
          "data-[state=open]:[animation:slide-down_140ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none",
        "data-highlighted:bg-accent-soft data-highlighted:text-accent data-[state=checked]:font-medium",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex items-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

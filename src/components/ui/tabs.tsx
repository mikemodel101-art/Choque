/*
 * components/ui/tabs.tsx — underline tabs on Radix.
 * Why: page-level navigation between views (e.g. "Browse / My schedule")
 * needs an accessible tab list with roving focus. Styled as a quiet
 * hairline-underline tab bar in the spirit of the design system.
 */
"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 border-b border-border overflow-x-auto no-scrollbar", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted transition-colors cursor-pointer",
        "hover:text-foreground data-[state=active]:border-accent data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content className={cn("focus-visible:outline-none", className)} {...props} />
  );
}

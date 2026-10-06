/*
 * components/ui/badge.tsx — small status labels.
 * Why: disciplines, verification, levels and counts appear everywhere; one
 * Badge keeps the 12px type, soft fills, and icon sizing consistent.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeStyles = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-foreground/[0.06] text-foreground",
        muted: "bg-foreground/[0.05] text-muted",
        outline: "border border-border text-muted",
        accent: "bg-accent-soft text-accent",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}

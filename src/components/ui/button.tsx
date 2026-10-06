/*
 * components/ui/button.tsx — the single Button component.
 * Why: one primary action per screen demands one consistent button. Variants
 * cover primary (accent), secondary (surface), soft (tinted accent), ghost,
 * and danger; every variant ships with hover, focus-visible, active, disabled
 * and loading states per the design spec. Radius is 8px (radius-sm).
 */
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium select-none transition-all duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-1 hover:bg-accent-strong focus-visible:outline-accent",
        secondary:
          "bg-surface text-foreground border border-border shadow-1 hover:border-muted/60 hover:bg-background",
        soft: "bg-accent-soft text-accent hover:brightness-[0.97] dark:hover:brightness-125",
        ghost: "text-foreground hover:bg-foreground/[0.05]",
        danger: "bg-danger text-white shadow-1 hover:brightness-110",
        unstyled: "",
      },
      size: {
        sm: "h-11 px-3.5 text-sm lg:h-9 lg:px-3",
        md: "h-11 px-4 text-sm lg:h-10",
        lg: "h-12 px-6 text-base",
        icon: "size-11 lg:size-10",
        "icon-sm": "size-10 lg:size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

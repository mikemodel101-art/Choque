/*
 * components/ui/avatar.tsx — person avatars with belt rank.
 * Why: practitioner identity in grappling is inseparable from belt rank, so
 * the avatar renders initials on a neutral wash and, when a belt color is
 * known, draws it as a ring — instantly readable rank context without noise.
 */
import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  beltColor?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-lg",
} as const;

export function Avatar({ name, beltColor, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] font-semibold text-foreground",
        SIZES[size],
        className,
      )}
      style={beltColor ? { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${beltColor}` } : undefined}
      aria-label={name}
      role="img"
    >
      {initials(name)}
    </span>
  );
}

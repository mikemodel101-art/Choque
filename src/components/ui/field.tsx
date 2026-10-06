/*
 * components/ui/field.tsx — form primitives (Label, Input, Textarea, Field).
 * Why: every form in CHOQUE (auth, notebook editor, roll requests, profile)
 * shares the same anatomy: label → control → hint/error. The Field wrapper
 * enforces that anatomy with proper aria wiring so errors are announced.
 */
"use client";

import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-foreground mb-1.5", className)}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-1 placeholder:text-muted/80 transition-colors lg:h-10",
        "hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-1 placeholder:text-muted/80 transition-colors",
        "hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error with aria-describedby wiring. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const describedBy = error || hint ? messageId : undefined;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children(id, describedBy)}
      {error ? (
        <p id={messageId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

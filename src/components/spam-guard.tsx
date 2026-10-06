/*
 * components/spam-guard.tsx — honeypot + captcha + client rate limiting.
 * Why: spec 5.8 asks for a honeypot and Turnstile on public forms, plus rate
 * limiting on auth and submissions. The honeypot is a visually hidden field
 * that humans never fill; if it has a value we silently reject. Turnstile
 * renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured, so the demo
 * build stays frictionless while production gets a real captcha.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

/* ——— Honeypot ——— */
export const HONEYPOT_NAME = "website_url";

/** Render inside any public form; pair with `isBot(formData)` on submit. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor={HONEYPOT_NAME}>Leave this field empty</label>
      <input
        id={HONEYPOT_NAME}
        name={HONEYPOT_NAME}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

/** True when the hidden field was filled — i.e. an automated submission. */
export function isBot(form: HTMLFormElement | FormData): boolean {
  const value =
    form instanceof FormData
      ? form.get(HONEYPOT_NAME)
      : new FormData(form).get(HONEYPOT_NAME);
  return typeof value === "string" && value.trim().length > 0;
}

/* ——— Client-side rate limiting (defence in depth; server limits too) ——— */
const BUCKETS = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (BUCKETS.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    BUCKETS.set(key, hits);
    return false; // denied
  }
  hits.push(now);
  BUCKETS.set(key, hits);
  return true; // allowed
}

/* ——— Cloudflare Turnstile (optional) ——— */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function Turnstile({ onVerify }: { onVerify?: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey) return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.dataset.turnstile = "true";
      s.onload = () => setReady(true);
      document.head.appendChild(s);
    } else setReady(true);
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !ready || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token: string) => onVerify?.(token),
    });
    return () => window.turnstile?.remove(id);
  }, [siteKey, ready, onVerify]);

  // No key configured (demo build): show the honest placeholder instead.
  if (!siteKey) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck className="size-3.5 text-success" />
        Protected by a honeypot and rate limiting. Turnstile activates when a site key is set.
      </p>
    );
  }
  return <div ref={ref} className="min-h-[65px]" />;
}

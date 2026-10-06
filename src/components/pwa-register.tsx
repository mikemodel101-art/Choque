/*
 * components/pwa-register.tsx — service worker registration.
 * Why: registering from a tiny client component keeps the root layout a
 * server component. Registration is deferred to the load event so it never
 * competes with first paint, and it is skipped in development where the SW
 * would cache stale bundles.
 */
"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is a progressive enhancement — failure is silent */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

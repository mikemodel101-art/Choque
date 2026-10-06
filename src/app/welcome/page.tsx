/*
 * app/welcome/page.tsx — first-sign-in code of conduct.
 * Why: a training community only stays safe if every member signs up to the
 * respectful-training standard on day one. This one-time screen explains the
 * norms in plain language, requires an explicit acknowledgment, and then
 * routes into onboarding. Skipping is not possible — the app shell sends
 * unacknowledged members back here.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Handshake, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import * as store from "@/lib/storage";
import { useSession } from "@/components/providers";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EASE_OUT } from "@/lib/motion";

const PROMISES = [
  {
    icon: Handshake,
    title: "Train by consent",
    body: "Intensity, submissions and contact are agreed before every round. A partner's limits override your goals.",
  },
  {
    icon: Users,
    title: "Respect every room",
    body: "Be the visitor you'd want on your mats. Rivalries stay on the competition floor, never in the directory or in reviews.",
  },
  {
    icon: ShieldAlert,
    title: "Protect people",
    body: "No harassment, no advances, no pressure. Block and report instantly; moderators act, and every decision is logged.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [checked, setChecked] = useState(false);

  if (!loading && !session) {
    router.replace("/sign-in");
    return null;
  }

  async function acknowledge() {
    store.setGuidelinesAcked(true);
    await api.getOnboarded().then((done) => {
      toast.success("Welcome to CHOQUE", { description: "Let's set up your training profile." });
      router.push(done ? "/gyms" : "/onboarding");
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-[-0.03em]">One promise before you train</h1>
        <p className="mt-2 text-sm text-muted">
          CHOQUE is a real community, not a feed. Read these three promises — they&apos;re the only
          rules that matter on and off the mat. The full{" "}
          <a href="/legal/guidelines" className="text-accent underline-offset-4 hover:underline">
            Community Guidelines
          </a>{" "}
          explain how they&apos;re enforced.
        </p>

        <div className="mt-6 space-y-3">
          {PROMISES.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: EASE_OUT }}
            >
              <Card className="flex gap-4 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                  <p.icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted">{p.body}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-1 transition-colors hover:border-muted/60">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-accent"
          />
          <span className="text-sm">
            I train by these rules — with consent, respect, and care for the person in front of me.
          </span>
        </label>

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!checked}
          onClick={acknowledge}
        >
          {checked ? <Check className="size-4" /> : <ShieldCheck className="size-4" />}
          I agree — let&apos;s go
        </Button>
        <p className="mt-3 text-center text-xs text-muted">
          You can review the guidelines any time at /legal/guidelines.
        </p>
      </motion.div>
    </main>
  );
}

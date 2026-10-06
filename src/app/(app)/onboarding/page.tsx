/*
 * app/(app)/onboarding/page.tsx — 3-step animated onboarding wizard.
 * Why: spec 5.3 — basics → training interests/level → availability & privacy.
 * Steps slide horizontally with framer (respecting reduced motion), progress
 * is always visible, nothing is lost when stepping back, and the final step
 * writes the profile plus per-field privacy defaults before returning the
 * member to the directory.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Eye, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useSession } from "@/components/providers";
import { GYMS } from "@/lib/data";
import { DISCIPLINES, type Discipline, type LookingFor, type Profile } from "@/lib/types";
import { EASE_OUT, useMotionEnabled } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Visibility = "public" | "connections" | "private";
const TIMES = ["Morning", "Midday", "Evening"] as const;
const INTENTS: LookingFor[] = ["Open mat", "Drilling", "Comp prep", "Beginner friendly"];

const VIS_FIELDS = [
  { key: "home_area", label: "Neighbourhood", hint: "Exact address is never shown — only your area." },
  { key: "belt_or_level", label: "Belt / level" },
  { key: "interests", label: "Training interests" },
  { key: "availability", label: "Availability" },
  { key: "bio", label: "Bio" },
] as const;

const VIS_OPTIONS: { value: Visibility; label: string; icon: typeof Eye }[] = [
  { value: "public", label: "Public", icon: Eye },
  { value: "connections", label: "Connections", icon: Users },
  { value: "private", label: "Private", icon: Lock },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session } = useSession();
  const enabled = useMotionEnabled();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // Step 1
  const [name, setName] = useState(session?.name ?? "");
  const [city, setCity] = useState("");
  const [homeGymId, setHomeGymId] = useState("none");
  // Step 2
  const [disciplines, setDisciplines] = useState<Discipline[]>(["bjj"]);
  const [rank, setRank] = useState("");
  const [bio, setBio] = useState("");
  // Step 3
  const [times, setTimes] = useState<string[]>(["Evening"]);
  const [intents, setIntents] = useState<LookingFor[]>(["Open mat"]);
  const [visibility, setVisibility] = useState<Record<string, Visibility>>({
    home_area: "connections",
    belt_or_level: "public",
    interests: "public",
    availability: "connections",
    bio: "public",
  });

  const save = useMutation({
    mutationFn: () => {
      const profile: Profile = {
        name: name.trim() || session?.name || "Practitioner",
        email: session?.email ?? "",
        city: city.trim(),
        homeGymId: homeGymId === "none" ? null : homeGymId,
        disciplines,
        rank: rank.trim(),
        bio: bio.trim(),
        lookingFor: intents,
        joinedAt: new Date().toISOString(),
        availability: times,
        visibility,
      };
      return api.completeOnboarding(profile);
    },
    onSuccess: () => {
      toast.success("You're all set", { description: "Welcome to CHOQUE." });
      router.push("/gyms");
    },
  });

  const steps = [
    { title: "The basics", blurb: "How should the community know you?" },
    { title: "Your training", blurb: "What you train, and where you're at." },
    { title: "Availability & privacy", blurb: "When you train — and who sees what." },
  ];

  const canAdvance = step === 0 ? name.trim().length >= 2 : step === 1 ? disciplines.length > 0 : true;

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  return (
    <div className="mx-auto max-w-xl py-6">
      {/* Progress */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Step {step + 1} of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{steps[step].title}</h1>
        <p className="mt-1 text-sm text-muted">{steps[step].blurb}</p>
        <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-foreground/[0.1]")} />
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-6">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={enabled ? { opacity: 0, x: dir * 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={enabled ? { opacity: 0, x: dir * -24 } : {}}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <Field label="Display name">
                  {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />}
                </Field>
                <Field label="City" hint="We only ever show your city or area — never your exact address.">
                  {(id, d) => <Input id={id} aria-describedby={d} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" />}
                </Field>
                <Field label="Home academy">
                  {(id) => (
                    <Select value={homeGymId} onValueChange={setHomeGymId}>
                      <SelectTrigger id={id} aria-label="Home academy"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not training anywhere yet</SelectItem>
                        {GYMS.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="What do you train?" hint="Pick everything that applies.">
                  {(id, d) => (
                    <div id={id} aria-describedby={d} className="flex flex-wrap gap-1.5 pt-1" role="group">
                      {DISCIPLINES.map((disc) => {
                        const on = disciplines.includes(disc.id);
                        return (
                          <button
                            key={disc.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDisciplines((cur) => on ? cur.filter((x) => x !== disc.id) : [...cur, disc.id])}
                            className={cn(
                              "h-11 rounded-full border px-4 text-xs font-medium transition-all active:scale-95 lg:h-9",
                              on ? "border-accent bg-accent text-white shadow-1" : "border-border bg-surface text-muted hover:border-muted/60",
                            )}
                          >
                            {disc.short}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
                <Field label="Belt or level">
                  {(id) => <Input id={id} value={rank} onChange={(e) => setRank(e.target.value)} placeholder="BJJ blue belt · Judo ikkyu" />}
                </Field>
                <Field label="A line about you">
                  {(id) => <Textarea id={id} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Two years in, obsessed with escapes, happy to drill with anyone." />}
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="When do you usually train?">
                  {(id) => (
                    <div id={id} className="flex flex-wrap gap-1.5 pt-1" role="group">
                      {TIMES.map((t) => {
                        const on = times.includes(t);
                        return (
                          <button key={t} type="button" aria-pressed={on}
                            onClick={() => setTimes((cur) => on ? cur.filter((x) => x !== t) : [...cur, t])}
                            className={cn("h-11 rounded-full border px-4 text-xs font-medium transition-all active:scale-95 lg:h-9",
                              on ? "border-accent bg-accent text-white shadow-1" : "border-border bg-surface text-muted hover:border-muted/60")}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
                <Field label="What are you looking for?">
                  {(id) => (
                    <div id={id} className="flex flex-wrap gap-1.5 pt-1" role="group">
                      {INTENTS.map((t) => {
                        const on = intents.includes(t);
                        return (
                          <button key={t} type="button" aria-pressed={on}
                            onClick={() => setIntents((cur) => on ? cur.filter((x) => x !== t) : [...cur, t])}
                            className={cn("h-11 rounded-full border px-4 text-xs font-medium transition-all active:scale-95 lg:h-9",
                              on ? "border-accent bg-accent text-white shadow-1" : "border-border bg-surface text-muted hover:border-muted/60")}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>

                <div className="pt-2">
                  <p className="text-sm font-medium">Who can see each field?</p>
                  <p className="mt-0.5 text-xs text-muted">You can change any of these later in your profile.</p>
                  <ul className="mt-3 space-y-2">
                    {VIS_FIELDS.map((f) => (
                      <li key={f.key} className="rounded-sm border border-border p-2.5">
                        <p className="text-sm font-medium">{f.label}</p>
                        {"hint" in f && f.hint && <p className="mb-1.5 text-xs text-muted">{f.hint}</p>}
                        <div className="mt-1.5 flex gap-1" role="group" aria-label={`Visibility for ${f.label}`}>
                          {VIS_OPTIONS.map((o) => {
                            const on = visibility[f.key] === o.value;
                            return (
                              <button key={o.value} type="button" aria-pressed={on}
                                onClick={() => setVisibility((v) => ({ ...v, [f.key]: o.value }))}
                                className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-sm text-xs font-medium transition-colors",
                                  on ? "bg-accent-soft text-accent" : "text-muted hover:bg-foreground/[0.05]")}>
                                <o.icon className="size-3.5" /> {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button variant="ghost" onClick={() => (step === 0 ? router.push("/gyms") : go(step - 1))}>
            <ArrowLeft className="size-4" /> {step === 0 ? "Skip for now" : "Back"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => go(step + 1)} disabled={!canAdvance}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              <Check className="size-4" /> Finish setup
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

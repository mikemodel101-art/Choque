/*
 * components/waitlist.tsx — "Join this city" waitlist.
 * Why: when the directory has no gyms in a city, the honest answer is to let
 * visitors register interest. The email is collected with rate limiting + a
 * honeypot, stored locally with an analytics event, and the member gets a
 * guaranteed thank-you. Zero fake "network effect" claims.
 */
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellPlus, Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { Honeypot, isBot, rateLimit } from "@/components/spam-guard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  city: z.string().min(2, "Which city?"),
});
type Form = z.infer<typeof schema>;

export function WaitlistButton({ city }: { city?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { city: city ?? "" } });

  const join = useMutation({
    mutationFn: (v: Form) => api.joinWaitlist(v.city, v.email),
    onSuccess: (_r, v) => {
      setDone(true);
      toast.success(`You're on the ${v.city} waitlist`, {
        description: "We'll email you the moment CHOQUE launches there.",
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add you yet"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); form.reset(); } }}>
      <DialogTrigger asChild>
        <Button variant="secondary"><BellPlus className="size-4" /> Join the waitlist</Button>
      </DialogTrigger>
      <DialogContent
        title="Get notified when we launch here"
        description="One email when your first local gym goes live. Nothing else."
      >
        {done ? (
          <div className="py-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
              <Check className="size-5 text-success" />
            </span>
            <p className="mt-3 text-sm font-medium">You&apos;re on the list.</p>
            <p className="mt-1 text-xs text-muted">We only send the launch email — no drip campaigns.</p>
          </div>
        ) : (
          <form
            className="relative space-y-4"
            noValidate
            onSubmit={(e) => {
              if (isBot(e.currentTarget)) { e.preventDefault(); return; }
              if (!rateLimit("waitlist", 3, 60_000)) {
                e.preventDefault();
                toast.error("Slow down — try again in a minute.");
                return;
              }
              void form.handleSubmit((v) => join.mutate(v))(e);
            }}
          >
            <Honeypot />
            <Field label="City" error={form.formState.errors.city?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} placeholder="e.g. Denver" {...form.register("city")} />}
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              {(id, d) => <Input id={id} type="email" aria-describedby={d} placeholder="you@dojo.com" {...form.register("email")} />}
            </Field>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <MapPin className="size-3.5" /> One launch email, then silence.
              </p>
              <Button type="submit" loading={join.isPending}>Join the waitlist</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

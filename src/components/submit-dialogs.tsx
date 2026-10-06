/*
 * components/submit-dialogs.tsx — community submissions.
 * Why: the access matrix grants members (active, non-suspended) the right to
 * suggest gyms and submit open mats. These dialogs collect the listing and
 * persist it as a PENDING submission for the staff review queue (mirrors
 * draft|pending|published|rejected in SQL). The demo API re-checks the role
 * and suspension state before accepting, so the UI gate is only a courtesy.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, CalendarPlus, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { SubmissionKind } from "@/lib/types";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const gymSchema = z.object({
  name: z.string().min(3, "Give the academy a name"),
  city: z.string().min(2, "Which city?"),
  website: z.string().max(200).default(""),
  dropIn: z.string().max(60).default(""),
  description: z.string().min(20, "A couple of sentences helps visitors know what to expect"),
});

const matSchema = z.object({
  title: z.string().min(3, "Give the open mat a title"),
  city: z.string().min(2, "Which city?"),
  day: z.string().min(1, "Pick a day"),
  start: z.string().min(1, "When does it start?"),
  host: z.string().min(2, "Who's hosting?"),
  notes: z.string().max(500).default(""),
});

type GymForm = z.input<typeof gymSchema>;
type MatForm = z.input<typeof matSchema>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SubmitGymDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm<GymForm>({
    resolver: zodResolver(gymSchema),
    defaultValues: { website: "", dropIn: "" },
  });

  async function submit(v: GymForm) {
    try {
      await api.createSubmission("gym", {
        title: v.name,
        summary: `${v.city} · ${v.dropIn || "drop-in pricing TBD"}`,
        payload: {
          name: v.name, city: v.city, website: v.website ?? "", drop_in: v.dropIn ?? "", description: v.description,
        },
      });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Gym suggested", { description: "Staff will review and publish it." });
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit right now.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Building2 className="size-4" /> Suggest a gym</Button>
      </DialogTrigger>
      <DialogContent title="Suggest a gym" description="Goes into the review queue — staff publish after a quick check.">
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <Field label="Academy name" error={form.formState.errors.name?.message}>
            {(id, d) => <Input id={id} placeholder="e.g. Downtown Grappling Co." aria-describedby={d} {...form.register("name")} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" error={form.formState.errors.city?.message}>
              {(id, d) => <Input id={id} placeholder="Portland" aria-describedby={d} {...form.register("city")} />}
            </Field>
            <Field label="Drop-in fee">
              {(id) => <Input id={id} placeholder="$25" {...form.register("dropIn")} />}
            </Field>
          </div>
          <Field label="Website">
            {(id) => <Input id={id} placeholder="https://" {...form.register("website")} />}
          </Field>
          <Field label="Why should visitors train here?" error={form.formState.errors.description?.message}>
            {(id, d) => <Textarea id={id} rows={3} aria-describedby={d} {...form.register("description")} />}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}><Send className="size-4" /> Submit for review</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitMatDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm<MatForm>({
    resolver: zodResolver(matSchema),
    defaultValues: { day: "Saturday", notes: "" },
  });

  async function submit(v: MatForm) {
    try {
      await api.createSubmission("open_mat", {
        title: v.title,
        summary: `${v.day}s ${v.start} · ${v.city} · host: ${v.host}`,
        payload: {
          title: v.title, city: v.city, day_of_week: v.day, start_time: v.start, host: v.host, notes: v.notes ?? "",
        },
      });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Open mat submitted", { description: "Appears publicly after staff approval." });
      form.reset({ day: "Saturday", notes: "" });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit right now.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><CalendarPlus className="size-4" /> Submit an open mat</Button>
      </DialogTrigger>
      <DialogContent title="Submit an open mat" description="Share your community's mat — staff will publish after review.">
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <Field label="Title" error={form.formState.errors.title?.message}>
            {(id, d) => <Input id={id} placeholder="e.g. Sunday scramble" aria-describedby={d} {...form.register("title")} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" error={form.formState.errors.city?.message}>
              {(id, d) => <Input id={id} placeholder="Austin" aria-describedby={d} {...form.register("city")} />}
            </Field>
            <Field label="Host" error={form.formState.errors.host?.message}>
              {(id, d) => <Input id={id} placeholder="Your name" aria-describedby={d} {...form.register("host")} />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day of week" error={form.formState.errors.day?.message}>
              {(id, d) => (
                <Select value={form.watch("day")} onValueChange={(v) => form.setValue("day", v, { shouldDirty: true })}>
                  <SelectTrigger id={id} aria-label="Day of week" aria-describedby={d}>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Starts at" error={form.formState.errors.start?.message}>
              {(id, d) => <Input id={id} type="time" aria-describedby={d} {...form.register("start")} />}
            </Field>
          </div>
          <Field label="Notes for visitors">
            {(id) => <Textarea id={id} rows={3} placeholder="Gear, intensity, parking…" {...form.register("notes")} />}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}><Send className="size-4" /> Submit for review</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

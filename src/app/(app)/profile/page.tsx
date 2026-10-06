/*
 * app/(app)/profile/page.tsx — account, identity & data controls.
 * Why: the fifth tab fills out the loop — the practitioner edits who they are
 * (home academy, disciplines, rank, intent), reviews what they've stored
 * (saved gyms, sent roll requests, their activity log), and controls their
 * data (export on the notebook page, full reset here). Everything is real and
 * persisted locally, consistent with the demo build.
 */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bookmark,
  CalendarCheck2,
  Eye,
  Handshake,
  KeyRound,
  Lock,
  LogOut,
  MailCheck,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { GYMS, GYM_BY_ID, PARTNERS } from "@/lib/data";
import { useEventLog, useSavedGyms } from "@/lib/hooks";
import { useSession } from "@/components/providers";
import { DISCIPLINES, type Discipline, type Profile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ProfileFormValues {
  name: string;
  city: string;
  rank: string;
  homeGymId: string; // "none" allowed
  bio: string;
  avatarUrl?: string;
}

/* Per-field privacy controls (spec 5.3) */
const PRIVACY_FIELDS = [
  { key: "home_area", label: "Neighbourhood", fallback: "connections" as const },
  { key: "belt_or_level", label: "Belt / level", fallback: "public" as const },
  { key: "interests", label: "Training interests", fallback: "public" as const },
  { key: "availability", label: "Availability", fallback: "connections" as const },
  { key: "bio", label: "Bio", fallback: "public" as const },
  { key: "avatar_url", label: "Avatar", fallback: "public" as const },
];

const VIS_OPTIONS = [
  { value: "public" as const, label: "Public", icon: Eye },
  { value: "connections" as const, label: "Connections", icon: Users },
  { value: "private" as const, label: "Private", icon: Lock },
];

/* ——— Change email: sends a verification link (demo) ——— */
function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const emailForm = useForm<{ email: string }>({ defaultValues: { email: "" } });
  const mutation = useMutation({
    mutationFn: (v: { email: string }) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) throw new Error("invalid");
      return api.requestEmailChange(v.email);
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Verification link sent", { description: "Confirm from your new inbox to finish the change." });
    },
    onError: () => emailForm.setError("email", { message: "Enter a valid email address" }),
  });

  if (sent) {
    return (
      <p className="flex items-start gap-2.5 rounded-sm bg-success/10 px-3 py-2.5 text-xs text-success">
        <MailCheck className="mt-0.5 size-4 shrink-0" />
        Verification sent. Open it to finish moving your account.
      </p>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-muted/60"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-muted"><MailCheck className="size-4" /> Email</span>
        <span className="truncate text-xs text-muted">{open ? "Cancel" : currentEmail}</span>
      </button>
      {open && (
        <form
          className="mt-2 space-y-2"
          onSubmit={emailForm.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <Field label="New email" error={emailForm.formState.errors.email?.message}>
            {(id, describedBy) => (
              <Input id={id} type="email" placeholder="new@address.com" aria-describedby={describedBy} {...emailForm.register("email")} />
            )}
          </Field>
          <Button size="sm" loading={mutation.isPending}>Send verification link</Button>
        </form>
      )}
    </div>
  );
}

/* ——— Change password (validated; demo confirms via toast) ——— */
function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const pwForm = useForm<{ current: string; next: string; confirm: string }>({
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: async (v: { current: string; next: string; confirm: string }) => {
      if (v.current.length < 8) throw new Error("current");
      if (v.next.length < 8) throw new Error("next");
      if (v.next !== v.confirm) throw new Error("mismatch");
      return api.changePassword();
    },
    onSuccess: () => {
      setOpen(false);
      pwForm.reset();
      toast.success("Password updated");
    },
    onError: (e: Error) => {
      const msg =
        e.message === "current" ? "Your current password — 8+ characters"
        : e.message === "next" ? "At least 8 characters"
        : "Passwords don't match";
      pwForm.setError(e.message === "current" ? "current" : e.message === "next" ? "next" : "confirm", { message: msg });
    },
  });

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-muted/60"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-muted"><KeyRound className="size-4" /> Password</span>
        <span className="text-xs text-muted">{open ? "Cancel" : <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5 text-success" /> Change</span>}</span>
      </button>
      {open && (
        <form
          className="mt-2 space-y-2"
          onSubmit={pwForm.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <Field label="Current password" error={pwForm.formState.errors.current?.message}>
            {(id, describedBy) => <Input id={id} type="password" autoComplete="current-password" aria-describedby={describedBy} {...pwForm.register("current")} />}
          </Field>
          <Field label="New password" error={pwForm.formState.errors.next?.message}>
            {(id, describedBy) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} {...pwForm.register("next")} />}
          </Field>
          <Field label="Repeat new password" error={pwForm.formState.errors.confirm?.message}>
            {(id, describedBy) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} {...pwForm.register("confirm")} />}
          </Field>
          <Button size="sm" loading={mutation.isPending}>Update password</Button>
        </form>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { session, signOut } = useSession();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: savedIds } = useSavedGyms();
  const { data: requests } = useQuery({ queryKey: ["requests"], queryFn: api.listRequests });
  const { data: rsvpMats } = useQuery({ queryKey: ["mats", { mine: true }], queryFn: () => api.listOpenMats({ mine: true }) });
  const { data: events } = useEventLog();

  const form = useForm<ProfileFormValues>({
    defaultValues: { name: "", city: "", rank: "", homeGymId: "none", bio: "" },
  });
  const disciplines = form.watch("disciplines" as never) as Discipline[] | undefined;

  // Hydrate the form once the saved profile arrives.
  useEffect(() => {
    if (profile) {
      form.setValue("name", profile.name);
      form.setValue("city", profile.city);
      form.setValue("rank", profile.rank);
      form.setValue("homeGymId", profile.homeGymId ?? "none");
      form.setValue("bio", profile.bio);
    }
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      const next: Profile = {
        name: values.name.trim() || session?.name || "Practitioner",
        email: session?.email ?? values.name,
        city: values.city.trim(),
        homeGymId: values.homeGymId === "none" ? null : values.homeGymId,
        disciplines: disciplines?.length ? disciplines : profile?.disciplines ?? ["bjj"],
        rank: values.rank.trim(),
        beltColor: profile?.beltColor,
        bio: values.bio.trim(),
        lookingFor: profile?.lookingFor ?? [],
        joinedAt: profile?.joinedAt ?? new Date().toISOString(),
        availability: profile?.availability,
        visibility: profile?.visibility,
        avatarUrl: "avatarUrl" in values ? values.avatarUrl : profile?.avatarUrl,
      };
      return api.saveProfile(next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
  });

  /** Per-field privacy writes go straight through — no form submit needed. */
  const privacyMutation = useMutation({
    mutationFn: (visibility: Record<string, "public" | "connections" | "private">) => {
      if (!profile) throw new Error("No profile");
      return api.saveProfile({ ...profile, visibility });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Privacy updated");
    },
  });

  const resetMutation = useMutation({
    mutationFn: api.resetDemoData,
    onSuccess: () => {
      qc.clear();
      toast.success("Demo data reset", { description: "Notebook, RSVPs, requests, and saves cleared." });
      router.refresh();
      window.location.href = "/sign-in";
    },
  });

  if (isLoading || !session) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  const savedGymList = (savedIds ?? []).map((id) => GYM_BY_ID.get(id)).filter(Boolean);
  const requestList = (requests ?? [])
    .map((r) => ({ ...r, partner: PARTNERS.find((p) => p.slug === r.partnerSlug) }))
    .filter((r) => r.partner);

  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description={`Signed in as ${session.email}`}
        action={
          <Button variant="secondary" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Identity form */}
        <Card className="p-6">
          <AvatarUpload
            name={profile?.name || session.name}
            value={profile?.avatarUrl}
            onChange={(dataUrl: string | undefined) => {
              if (!profile) return;
              saveMutation.mutate({
                name: form.getValues("name"), city: form.getValues("city"),
                rank: form.getValues("rank"), homeGymId: form.getValues("homeGymId"),
                bio: form.getValues("bio"), avatarUrl: dataUrl,
              });
            }}
          />
          <div className="mt-4">
            <SectionTitle title={profile?.name || session.name} description={
              profile?.joinedAt ? `Member since ${formatDate(profile.joinedAt.slice(0, 10))}` : "Demo account"
            } />
          </div>

          {/* Per-field privacy — mirrors profiles.visibility in Supabase */}
          <div className="mt-5 rounded-sm border border-border p-4">
            <p className="text-sm font-medium">Who can see each field?</p>
            <p className="mt-0.5 text-xs text-muted">
              Exact location is never shown — only your city or neighbourhood. Contact details are
              exchanged only after you both accept a connection.
            </p>
            <ul className="mt-3 space-y-2">
              {PRIVACY_FIELDS.map((f) => {
                const current = profile?.visibility?.[f.key] ?? f.fallback;
                return (
                  <li key={f.key} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">{f.label}</span>
                    <div className="flex gap-1" role="group" aria-label={`Visibility for ${f.label}`}>
                      {VIS_OPTIONS.map((o) => {
                        const on = current === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              if (!profile) return;
                              privacyMutation.mutate({ ...(profile.visibility ?? {}), [f.key]: o.value });
                            }}
                            className={cn(
                              "inline-flex h-9 items-center gap-1 rounded-sm px-2.5 text-xs font-medium transition-colors",
                              on ? "bg-accent-soft text-accent" : "text-muted hover:bg-foreground/[0.05]",
                            )}
                          >
                            <o.icon className="size-3.5" /> {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                {(id) => <Input id={id} placeholder="Your name" {...form.register("name")} />}
              </Field>
              <Field label="City">
                {(id) => <Input id={id} placeholder="e.g. Los Angeles" {...form.register("city")} />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rank" hint="e.g. BJJ blue belt · Judo nikyu">
                {(id, describedBy) => <Input id={id} aria-describedby={describedBy} placeholder="BJJ white belt" {...form.register("rank")} />}
              </Field>
              <Field label="Home academy">
                {(id) => (
                  <Select value={form.watch("homeGymId")} onValueChange={(v) => form.setValue("homeGymId", v)}>
                    <SelectTrigger id={id} aria-label="Home academy"><SelectValue placeholder="Choose a gym" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No home academy</SelectItem>
                      {GYMS.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Disciplines" hint="Tap to toggle what you train.">
              {(id, describedBy) => (
                <div id={id} aria-describedby={describedBy} className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Your disciplines">
                  {DISCIPLINES.map((d) => {
                    const current = disciplines ?? profile?.disciplines ?? [];
                    const on = current.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const next = on ? current.filter((x) => x !== d.id) : [...current, d.id];
                          form.setValue("disciplines" as never, next as never);
                        }}
                        className={cn(
                          "h-8 rounded-full border px-3 text-xs font-medium transition-all cursor-pointer active:scale-95",
                          on
                            ? "border-accent bg-accent text-white shadow-1"
                            : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground",
                        )}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
            <Field label="About you" hint="What you're chasing on the mat — partners will see this.">
              {(id, describedBy) => (
                <Textarea id={id} rows={3} aria-describedby={describedBy} placeholder="Six months into no-gi, living on single legs…" {...form.register("bio")} />
              )}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={saveMutation.isPending}>Save profile</Button>
            </div>
          </form>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Saved gyms" description="Your shortlist" />
            {savedGymList.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <Bookmark className="size-4" /> Nothing saved yet — bookmark gyms from the directory.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {savedGymList.map((g) => (
                  <li key={g!.id}>
                    <Link href={`/gyms/${g!.slug}`} className="group flex items-center gap-3 rounded-sm border border-border p-2 transition-colors hover:border-muted/60">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-sm">
                        <Image src={g!.image} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-accent">{g!.name}</span>
                        <span className="block text-xs text-muted">{g!.city}, {g!.state}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Roll requests" description="Messages you've sent" />
            {requestList.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <Handshake className="size-4" /> None yet — find a partner and say hi.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {requestList.map((r) => (
                  <li key={r.id} className="rounded-sm border border-border p-3">
                    <p className="text-sm font-medium">
                      To{" "}
                      <Link href={`/partners/${r.partner!.slug}`} className="text-accent underline-offset-4 hover:underline">
                        {r.partner!.name}
                      </Link>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">“{r.message}”</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Activity" description="Your recent events" />
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {(events ?? []).slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-start gap-2">
                  <Activity className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>
                    {e.detail}
                    <span className="block text-[10px] uppercase tracking-wide text-muted/70">
                      {new Date(e.at).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
              {(events ?? []).length === 0 && <li>No activity yet.</li>}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Account & security" description="Email, password, session" />
            <div className="mt-4 space-y-3">
              <EmailChangeForm currentEmail={session.email} />
              <PasswordChangeForm />
            </div>
          </Card>

          <Card className="border-dashed p-5">
            <SectionTitle title="Demo data" description="You're signed in; content resets" />
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <CalendarCheck2 className="size-4" />
              {(rsvpMats ?? []).length} upcoming RSVP{(rsvpMats ?? []).length === 1 ? "" : "s"} stored in this browser.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-4"
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              <RotateCcw className="size-4" /> Reset all demo data
            </Button>
          </Card>
        </div>
      </div>

      {profile?.lookingFor?.length ? (
        <p className="text-xs text-muted">
          Looking for: {profile.lookingFor.map((l, i) => <Badge key={i} variant="muted" className="ml-1">{l}</Badge>)}
        </p>
      ) : null}

      <p className="flex items-center gap-2 text-xs text-muted">
        <UserRound className="size-4" />
        CHOQUE demo — your identity and activity never leave this browser.
      </p>
    </div>
    </PageTransition>
  );
}

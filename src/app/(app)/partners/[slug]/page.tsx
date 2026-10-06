/*
 * app/(app)/partners/[slug]/page.tsx — partner profile + roll requests.
 * Why: deciding to train with a stranger needs trust signals: rank, weight,
 * availability, home academy and a real bio. The "Request to roll" dialog
 * sends a message the partner would receive in production; in this demo it is
 * persisted locally and listed on the profile page — a real, testable loop.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BadgeCheck,
  Flag,
  ShieldOff,
  CalendarDays,
  Clock,
  MapPin,
  Send,
  Timer,
  Weight,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectButton, type ConnectState } from "@/components/connect-button";
import { PageTransition } from "@/components/motion";
import { GYM_BY_ID } from "@/lib/data";
import * as api from "@/lib/api";
import { usePartner } from "@/lib/hooks";
import { disciplineShort } from "@/lib/types";
import { cn, plural } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Field, Textarea } from "@/components/ui/field";
import { UserRoundX } from "lucide-react";

const requestSchema = z.object({
  message: z.string().min(10, "Say a little more — at least 10 characters").max(400),
});
type RequestForm = z.infer<typeof requestSchema>;

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PartnerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: partner, isLoading } = usePartner(slug);
  const { data: requests, refetch } = useQuery({ queryKey: ["requests"], queryFn: api.listRequests });
  const { data: meSuspended } = useQuery({ queryKey: ["me", "suspended"], queryFn: () => Promise.resolve(api.isCurrentUserSuspended()) });
  const [open, setOpen] = useState(false);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);

  const { data: blocks } = useQuery({ queryKey: ["blocks"], queryFn: api.listBlocks });
  const isBlocked = (blocks ?? []).includes(slug);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");

  const blockMutation = useMutation({
    mutationFn: api.toggleBlock,
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
      toast.success(next.includes(slug) ? "Blocked" : "Unblocked", {
        description: next.includes(slug)
          ? "You can no longer see each other anywhere on CHOQUE."
          : "They can find you again.",
      });
      if (next.includes(slug)) router.push("/partners");
    },
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      api.reportListing("profile", slug, reportReason, reportDetails, partner?.name),
    onSuccess: () => {
      toast.success("Report sent to moderators", { description: "We review every report." });
      setReportOpen(false);
      setReportDetails("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send report"),
  });

  function onRequestClick() {
    if (meSuspended) {
      toast.error("Your account is suspended", { description: "Connection requests are disabled. Contact staff to appeal." });
      return;
    }
    setOpen(true);
  }

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { message: "" },
  });

  const alreadyRequested = useMemo(
    () => (requests ?? []).some((r) => r.partnerSlug === slug),
    [requests, slug],
  );

  if (isLoading) return <PartnerDetailSkeleton />;

  if (!partner) {
    return (
      <EmptyState
        icon={UserRoundX}
        title="Practitioner not found"
        description="This profile may have been deactivated."
        action={<Link href="/partners"><Button variant="secondary">Back to partners</Button></Link>}
      />
    );
  }

  const gym = GYM_BY_ID.get(partner.homeGymId);
  const suggested = `Hi ${partner.name.split(" ")[0]} — I saw you're free ${partner.availability[0].toLowerCase()}s. Want to drill at ${gym?.name ?? "open mat"} this week?`;

  const effectiveState: ConnectState =
    connectState ?? (alreadyRequested ? "requested" : "idle");

  async function sendRequest(data: RequestForm) {
    setConnectState("loading");
    try {
      await api.requestRoll(partner!.slug, data.message);
      await refetch();
      setConnectState("requested");
      setOpen(false);
      form.reset();
      toast.success(`Request sent to ${partner!.name}`, {
        description: "You'll be notified when they respond.",
      });
    } catch (e) {
      setConnectState("idle");
      const msg = e instanceof Error ? e.message : "";
      if (msg === "suspended") {
        toast.error("Your account is suspended", { description: "Browsing works, but connection requests are disabled. Contact staff to appeal." });
      } else if (msg === "limit") {
        toast.error("Daily request limit reached", { description: "You can send 10 connection requests per day. Try again tomorrow." });
      } else {
        toast.error("Couldn't send the request. Try again.");
      }
    }
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <Link href="/partners" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> All partners
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Avatar name={partner.name} beltColor={partner.beltColor} size="xl" />
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.03em]">
                {partner.name}
                {partner.verified && <BadgeCheck className="size-5 text-accent" aria-label="Verified member" />}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {partner.rank}
                {partner.stripes != null && partner.stripes > 0 && ` · ${partner.stripes} ${partner.stripes === 1 ? "stripe" : "stripes"}`}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="flex items-center gap-1"><MapPin className="size-4" /> {partner.city}, {partner.state}</span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", partner.lastActiveDays === 0 ? "bg-success" : "bg-foreground/25")} />
                  {partner.lastActiveDays === 0 ? "Active today" : `Active ${partner.lastActiveDays} days ago`}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {partner.disciplines.map((d) => <Badge key={d} variant="muted">{disciplineShort(d)}</Badge>)}
                {partner.lookingFor.map((l) => <Badge key={l} variant="accent">{l}</Badge>)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => blockMutation.mutate(partner!.slug)}
              loading={blockMutation.isPending}
            >
              <ShieldOff className="size-4" /> {isBlocked ? "Unblock" : "Block"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="size-4" /> Report
            </Button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <ConnectButton state={effectiveState} onRequest={onRequestClick} />
            </DialogTrigger>
            <DialogContent
              title={`Request to roll with ${partner.name.split(" ")[0]}`}
              description="Introduce yourself and suggest a time. Keep it short — practitioners skim."
            >
              <form onSubmit={form.handleSubmit(sendRequest)} className="space-y-4">
                <Field label="Message" error={form.formState.errors.message?.message}>
                  {(id, describedBy) => (
                    <Textarea
                      id={id}
                      rows={4}
                      placeholder={suggested}
                      aria-describedby={describedBy}
                      {...form.register("message")}
                    />
                  )}
                </Field>
                <button
                  type="button"
                  onClick={() => form.setValue("message", suggested, { shouldValidate: true })}
                  className="text-xs font-medium text-accent underline-offset-4 hover:underline"
                >
                  Use a suggested intro
                </button>
                <div className="flex justify-end gap-2">
                  <Button type="submit" loading={form.formState.isSubmitting}>
                    <Send className="size-4" /> Send request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold tracking-tight">About</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted measure">{partner.bio}</p>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-muted"><Weight className="size-4" /> Weight</dt>
                <dd className="font-medium">{partner.weightKg} kg</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-muted"><Timer className="size-4" /> Training</dt>
                <dd className="font-medium">{partner.yearsTraining} years</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-muted"><Clock className="size-4" /> Prefers</dt>
                <dd className="font-medium">{partner.availability.join(", ")}</dd>
              </div>
            </dl>
            {gym && (
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
                Home academy:{" "}
                <Link href={`/gyms/${gym.slug}`} className="font-medium text-accent underline-offset-4 hover:underline">
                  {gym.name}
                </Link>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <CalendarDays className="size-5 text-accent" /> Best days
            </h2>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {ALL_DAYS.map((day) => {
                const on = partner.weekdays.includes(day);
                return (
                  <span
                    key={day}
                    className={cn(
                      "rounded-sm py-1.5 text-xs font-medium",
                      on ? "bg-accent-soft text-accent" : "bg-foreground/[0.04] text-muted/60",
                    )}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Report this practitioner — available from any profile */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent
          title={`Report ${partner.name}`}
          description="Reports go to moderators. Your identity is never shared with the person you report."
        >
          <form onSubmit={(e) => { e.preventDefault(); reportMutation.mutate(); }} className="space-y-4">
            <Field label="Reason">
              {(id) => (
                <select
                  id={id}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10"
                >
                  <option value="harassment">Harassment or abuse</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="spam">Spam</option>
                  <option value="safety">Safety concern</option>
                  <option value="other">Something else</option>
                </select>
              )}
            </Field>
            <Field label="What happened?">
              {(id) => (
                <Textarea id={id} rows={4} value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Give moderators enough context to act." />
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={reportMutation.isPending}
                disabled={reportDetails.trim().length < 5}>
                Send report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}

function PartnerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-44 w-full rounded-md" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-40 rounded-md" />
      </div>
    </div>
  );
}

/*
 * components/gym-actions.tsx — listing-level actions on a gym profile.
 * Why: spec 5.1 requires "Report this listing", "Suggest an edit" and a share
 * button; the access matrix adds "claim this gym" for members who run it.
 * All three refuse to submit when the account is suspended — the API
 * re-checks, so disabling here is courtesy only.
 */
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, KeyRound, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useRole } from "@/components/can";
import type { Gym } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const REASONS = [
  { value: "fake_listing", label: "Listing is fake or closed" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Something else" },
];

const FIELDS = [
  { value: "schedule", label: "Class schedule" },
  { value: "address", label: "Address" },
  { value: "drop_in_fee_text", label: "Drop-in fee" },
  { value: "website", label: "Website / social" },
  { value: "visitor_info", label: "Visitor information" },
];

export function GymActions({ gym }: { gym: Gym }) {
  const role = useRole();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const [reason, setReason] = useState("fake_listing");
  const [details, setDetails] = useState("");
  const [field, setField] = useState("schedule");
  const [value, setValue] = useState("");
  const [claimMessage, setClaimMessage] = useState("");

  const report = useMutation({
    mutationFn: () => api.reportListing("gym", gym.id, reason, details),
    onSuccess: () => {
      toast.success("Report sent to moderators", { description: "Thanks — we review every report." });
      setReportOpen(false); setDetails("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send report"),
  });

  const edit = useMutation({
    mutationFn: () => api.suggestEdit(gym.id, field, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Suggestion submitted", { description: "Staff will review the change." });
      setEditOpen(false); setValue("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't submit suggestion"),
  });

  const claim = useMutation({
    mutationFn: () => api.claimGym(gym.id, claimMessage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim filed", { description: "An admin will review your ownership request." });
      setClaimOpen(false); setClaimMessage("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't file claim"),
  });

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: gym.name, text: `${gym.name} — ${gym.city}, ${gym.state} on CHOQUE`, url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      /* user dismissed the share sheet — nothing to report */
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" onClick={share}>
        <Share2 className="size-4" /> Share
      </Button>

      {/* Suggest an edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={!role.canPost}>
            <Pencil className="size-4" /> Suggest an edit
          </Button>
        </DialogTrigger>
        <DialogContent title={`Suggest an edit to ${gym.name}`} description="Corrections go to the moderation queue.">
          <form onSubmit={(e) => { e.preventDefault(); edit.mutate(); }} className="space-y-4">
            <Field label="What needs changing?">
              {(id) => (
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger id={id} aria-label="Field to change"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Correct information">
              {(id) => (
                <Textarea id={id} rows={3} required value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. Saturday open mat moved to 11:00" />
              )}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={edit.isPending} disabled={value.trim().length < 5}>Submit suggestion</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Claim ownership */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={!role.canPost}>
            <KeyRound className="size-4" /> Claim this gym
          </Button>
        </DialogTrigger>
        <DialogContent title={`Claim ${gym.name}`} description="Approved owners can edit their listing. An admin reviews every claim.">
          <form onSubmit={(e) => { e.preventDefault(); claim.mutate(); }} className="space-y-4">
            <Field label="How are you connected to this academy?" hint="Mention your role — owner, head coach, manager.">
              {(id, d) => (
                <Textarea id={id} rows={4} required aria-describedby={d} value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  placeholder="I'm the head coach and handle the schedule…" />
              )}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={claim.isPending} disabled={claimMessage.trim().length < 10}>
                File ownership claim
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={!role.canReport}>
            <Flag className="size-4" /> Report
          </Button>
        </DialogTrigger>
        <DialogContent title="Report this listing" description="Reports go to moderators. Your identity is not shared with the gym.">
          <form onSubmit={(e) => { e.preventDefault(); report.mutate(); }} className="space-y-4">
            <Field label="Reason">
              {(id) => (
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id={id} aria-label="Report reason"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Details">
              {(id) => (
                <Textarea id={id} rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
                  placeholder="What's wrong with this listing?" />
              )}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="danger" loading={report.isPending}>Send report</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {!role.canPost && role.signedIn && (
        <p className="w-full text-xs text-warning">
          Your account is suspended — reporting and submissions are disabled.
        </p>
      )}
    </div>
  );
}

/** Structured data so gym pages are rich results in search engines. */
export function GymJsonLd({ gym }: { gym: Gym }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: gym.name,
    description: gym.about,
    image: gym.image,
    address: {
      "@type": "PostalAddress",
      streetAddress: gym.address,
      addressLocality: gym.city,
      addressRegion: gym.state,
      addressCountry: "US",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: gym.rating,
      reviewCount: gym.reviews,
    },
    amenityFeature: gym.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a })),
    sport: gym.disciplines.join(", "),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD requires raw injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

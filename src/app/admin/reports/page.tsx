/*
 * app/admin/reports/page.tsx — reports queue with keyboard triage (staff).
 * Why: spec 5.6 — moderators need to see the target, its history, and act
 * (dismiss / hide listing / warn / suspend user) with a logged reason.
 * Keyboard shortcuts make triage fast: j/k move the cursor, a dismisses
 * ("approve as fine"), r opens the action sheet for a harder outcome.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, CalendarCheck2, Flag, Keyboard, ShieldAlert, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useReports } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const TARGET_ICON = {
  profile: UserRound,
  gym: Building2,
  open_mat: CalendarCheck2,
} as const;

const ACTIONS: { id: api.ReportAction; label: string; variant: "soft" | "secondary" | "danger" }[] = [
  { id: "dismiss", label: "Dismiss", variant: "secondary" },
  { id: "hide", label: "Hide listing", variant: "soft" },
  { id: "warn", label: "Warn user", variant: "soft" },
  { id: "suspend", label: "Suspend user", variant: "danger" },
];

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const role = useRole();
  const { data: reports, isLoading, error } = useReports();
  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<{ id: string; action: api.ReportAction } | null>(null);
  const [reason, setReason] = useState("");

  const open = useMemo(() => (reports ?? []).filter((r) => r.status === "open"), [reports]);
  const closed = useMemo(() => (reports ?? []).filter((r) => r.status !== "open"), [reports]);

  const act = useMutation({
    mutationFn: () => {
      if (!pending) throw new Error("Nothing selected");
      return api.actionReport(pending.id, pending.action, reason);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      qc.invalidateQueries({ queryKey: ["demo-users"] });
      toast.success(r.resolution ?? "Report actioned");
      setPending(null);
      setReason("");
      setCursor((c) => Math.max(0, Math.min(c, open.length - 2)));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  /* ——— j/k to move, a to dismiss, r to open the action sheet ——— */
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (pending) return;
      const el = document.activeElement;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      if (open.length === 0) return;

      if (e.key === "j") { e.preventDefault(); setCursor((c) => Math.min(open.length - 1, c + 1)); }
      else if (e.key === "k") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key === "a") { e.preventDefault(); setPending({ id: open[cursor].id, action: "dismiss" }); }
      else if (e.key === "r") { e.preventDefault(); setPending({ id: open[cursor].id, action: "hide" }); }
    },
    [open, cursor, pending],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!role.loading && !role.isStaff) {
    return <EmptyState icon={ShieldAlert} title="Staff only" description="The reports queue is restricted to moderators and admins." />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Review what was reported, see the target's history, then dismiss or escalate. Every action is logged."
          action={
            <span className="hidden items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-xs text-muted shadow-1 sm:inline-flex">
              <Keyboard className="size-4" />
              <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> move ·{" "}
              <kbd className="font-mono">a</kbd> dismiss · <kbd className="font-mono">r</kbd> act
            </span>
          }
        />

        {isLoading ? (
          <><Skeleton className="h-28 rounded-md" /><Skeleton className="h-28 rounded-md" /></>
        ) : error ? (
          <EmptyState icon={ShieldAlert} title="Not permitted" description="Only staff can read the reports queue." />
        ) : open.length === 0 && closed.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No reports"
            description="When a member reports a listing or a profile, it appears here for triage."
          />
        ) : (
          <div className="space-y-3">
            {open.map((r, i) => {
              const Icon = TARGET_ICON[r.targetType];
              const active = i === cursor;
              return (
                <Card
                  key={r.id}
                  className={cn("p-5 transition-all", active && "border-accent ring-2 ring-accent/25")}
                  aria-current={active ? "true" : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        <Icon className="size-3.5" /> {r.targetType.replace("_", " ")}
                        <Badge variant="warning">{r.reason.replace("_", " ")}</Badge>
                      </p>
                      <h3 className="mt-1 text-base font-semibold tracking-tight">
                        {r.targetType === "gym" ? (
                          <Link href={`/gyms`} className="underline-offset-4 hover:text-accent hover:underline">{r.targetLabel}</Link>
                        ) : r.targetLabel}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted">
                        reported by {r.reporter} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                      {r.details && <p className="mt-2 text-sm text-muted measure">“{r.details}”</p>}
                      <p className="mt-2 text-xs text-muted/80">
                        History: {(reports ?? []).filter((x) => x.targetId === r.targetId).length} report(s) against this target.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {ACTIONS.map((a) => (
                        <Button
                          key={a.id}
                          size="sm"
                          variant={a.variant}
                          disabled={a.id === "suspend" && r.targetType !== "profile"}
                          onClick={() => setPending({ id: r.id, action: a.id })}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}

            {closed.length > 0 && (
              <>
                <p className="pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Resolved</p>
                {closed.slice(0, 8).map((r) => (
                  <Card key={r.id} className="p-4 opacity-80">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{r.targetLabel}</span>
                      <Badge variant={r.status === "dismissed" ? "muted" : "success"}>{r.status}</Badge>
                      <span className="text-xs text-muted">{r.resolution} · by {r.handledBy}</span>
                    </p>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Reason is mandatory for every outcome, including dismissal */}
        <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setReason(""); } }}>
          <DialogContent
            title={`${ACTIONS.find((a) => a.id === pending?.action)?.label ?? "Action"} this report`}
            description="Your name, the time and this reason are written to the audit log."
          >
            <form onSubmit={(e) => { e.preventDefault(); act.mutate(); }} className="space-y-4">
              <div>
                <label htmlFor="report-reason" className="mb-1.5 block text-sm font-medium">Reason</label>
                <Input
                  id="report-reason"
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Verified with the gym — listing is accurate"
                />
                {reason.trim().length > 0 && reason.trim().length < 5 && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">At least 5 characters.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setPending(null); setReason(""); }}>Cancel</Button>
                <Button type="submit" loading={act.isPending} disabled={reason.trim().length < 5}>Confirm &amp; log</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

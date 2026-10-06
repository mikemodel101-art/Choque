/*
 * app/admin/page.tsx — moderation review queue (staff).
 * Why: the first thing a moderator needs. Submitted gyms and open mats land
 * here as pending; approving publishes them, rejecting records the decision.
 * Both actions are written to the audit log with the actor and timestamp.
 */
"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarCheck2, CheckCircle2, FileCheck2, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useEventLog, useSubmissions } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Separator, Skeleton } from "@/components/ui/misc";

export default function AdminQueuePage() {
  const qc = useQueryClient();
  const role = useRole();
  const { data: submissions, isLoading } = useSubmissions(false);
  const { data: events } = useEventLog();

  const pending = useMemo(() => (submissions ?? []).filter((s) => s.status === "pending"), [submissions]);
  const reviewed = useMemo(() => (submissions ?? []).filter((s) => s.status !== "pending"), [submissions]);

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => api.reviewSubmission(id, approve),
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(next.status === "approved" ? "Approved — now published" : "Rejected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Review queue"
          description={`Community submissions awaiting a decision. You are signed in as ${role.name}.`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending", value: pending.length },
            { label: "Decided", value: reviewed.length },
            { label: "Approved", value: reviewed.filter((s) => s.status === "approved").length },
            { label: "Events", value: (events ?? []).length },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-medium text-muted">{s.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{s.value}</p>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <><Skeleton className="h-28 rounded-md" /><Skeleton className="h-28 rounded-md" /></>
        ) : pending.length === 0 && reviewed.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Queue is clear"
            description="When members suggest a gym or submit an open mat it appears here for review."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {s.kind === "gym" ? <Building2 className="size-3.5" /> : <CalendarCheck2 className="size-3.5" />}
                      {s.kind === "gym" ? "Gym" : "Open mat"}
                      <Badge variant="warning">pending</Badge>
                    </p>
                    <h3 className="mt-1 text-base font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-0.5 text-sm text-muted">{s.summary}</p>
                    <p className="mt-1 text-xs text-muted/80">
                      {s.submittedByName} ({s.submittedBy}) · {new Date(s.createdAt).toLocaleString()}
                    </p>
                    {(s.payload.description || s.payload.notes || s.payload.value) && (
                      <p className="mt-2 text-sm text-muted measure">
                        {s.payload.description || s.payload.notes || `${s.payload.field}: ${s.payload.value}`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="soft"
                      loading={review.isPending && review.variables?.id === s.id && review.variables.approve}
                      onClick={() => review.mutate({ id: s.id, approve: true })}>
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary"
                      loading={review.isPending && review.variables?.id === s.id && !review.variables.approve}
                      onClick={() => review.mutate({ id: s.id, approve: false })}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {reviewed.length > 0 && (
              <>
                <Separator className="my-5" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recently decided</p>
                {reviewed.slice(0, 8).map((s) => (
                  <Card key={s.id} className="p-4 opacity-80">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{s.title}</span>
                      <Badge variant={s.status === "approved" ? "success" : "muted"}>{s.status}</Badge>
                      <span className="text-xs text-muted">by {s.decidedBy}</span>
                    </p>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

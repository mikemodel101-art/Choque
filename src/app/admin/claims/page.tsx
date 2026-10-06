/*
 * app/admin/claims/page.tsx — gym ownership claims (staff).
 * Why: "Edit own claimed gym" is a Gym Owner capability, and ownership is
 * only granted by staff approving a claim. Approving writes a gym_owners row
 * (demo: an ownership map), promotes the claimant to the owner role, and logs
 * the decision with the required reason.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";

export default function AdminClaimsPage() {
  const qc = useQueryClient();
  const { data: claims, isLoading } = useQuery({ queryKey: ["claims"], queryFn: api.listClaims });
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.reviewClaim(id, approve, reasons[id] ?? ""),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["demo-users"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success(c.status === "approved" ? "Ownership granted" : "Claim rejected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const pending = (claims ?? []).filter((c) => c.status === "pending");
  const decided = (claims ?? []).filter((c) => c.status !== "pending");

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Gym claims"
          description="Approving a claim makes this member the gym owner, letting them edit that listing."
        />

        {isLoading ? (
          <Skeleton className="h-32 rounded-md" />
        ) : pending.length === 0 && decided.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No ownership claims"
            description="When a member claims a gym from its profile page, the request lands here."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((c) => (
              <Card key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <KeyRound className="size-3.5" /> Ownership claim <Badge variant="warning">pending</Badge>
                    </p>
                    <h3 className="mt-1 text-base font-semibold tracking-tight">
                      <Link href={`/gyms/${c.gymSlug}`} className="underline-offset-4 hover:text-accent hover:underline">
                        {c.gymName}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">{c.name} · {c.email}</p>
                    <p className="mt-2 text-sm text-muted measure">“{c.message}”</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Input
                    value={reasons[c.id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [c.id]: e.target.value }))}
                    placeholder="Reason (required, logged)"
                    aria-label={`Reason for decision on ${c.gymName}`}
                    className="max-w-xs flex-1"
                  />
                  <Button size="sm" variant="soft"
                    loading={review.isPending && review.variables?.id === c.id && review.variables.approve}
                    onClick={() => review.mutate({ id: c.id, approve: true })}>
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                  <Button size="sm" variant="secondary"
                    loading={review.isPending && review.variables?.id === c.id && !review.variables.approve}
                    onClick={() => review.mutate({ id: c.id, approve: false })}>
                    <XCircle className="size-4" /> Reject
                  </Button>
                </div>
              </Card>
            ))}

            {decided.map((c) => (
              <Card key={c.id} className="p-4 opacity-80">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{c.gymName}</span>
                  <Badge variant={c.status === "approved" ? "success" : "muted"}>{c.status}</Badge>
                  <span className="text-xs text-muted">{c.email} · decided by {c.decidedBy}</span>
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

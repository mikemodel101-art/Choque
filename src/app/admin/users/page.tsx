/*
 * app/admin/users/page.tsx — user management (ADMIN ONLY).
 * Why: the matrix gives admins alone the power to promote/demote and to
 * unsuspend. Every destructive action demands a written reason that is
 * recorded in the audit log alongside the actor and timestamp. The last
 * remaining admin cannot be demoted or suspended — the UI disables it and
 * the API refuses it, mirroring the database trigger.
 */
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Search, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useDemoUsers } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { roleLabel } from "@/lib/demo-accounts";
import type { AppRole } from "@/lib/types";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Pending =
  | { kind: "role"; email: string; name: string; nextRole: AppRole }
  | { kind: "suspend"; email: string; name: string; suspend: boolean };

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const role = useRole();
  const [q, setQ] = useState("");
  const { data: users, isLoading } = useDemoUsers(q);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["demo-users"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const act = useMutation({
    mutationFn: async () => {
      if (!pending) return;
      if (pending.kind === "role") return api.setUserRole(pending.email, pending.nextRole, reason);
      return api.setUserSuspended(pending.email, pending.suspend, reason);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Change applied and logged");
      setPending(null);
      setReason("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Not permitted"),
  });

  const activeAdmins = (users ?? []).filter((u) => u.role === "admin" && !u.suspended).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Search accounts, review role and status, and apply changes. Every change requires a reason and is written to the audit log."
        />

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <input
            id="user-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm shadow-1 placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-10"
          />
        </div>

        {isLoading ? (
          <><Skeleton className="h-20 rounded-md" /><Skeleton className="h-20 rounded-md" /></>
        ) : (
          <div className="space-y-3">
            {(users ?? []).map((u) => {
              const isLastAdmin = u.role === "admin" && !u.suspended && activeAdmins <= 1;
              return (
                <Card key={u.email} className="flex flex-wrap items-center gap-4 p-4">
                  <Avatar name={u.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {u.name}
                      {u.isSelf && <Badge variant="muted">you</Badge>}
                      <Badge variant={u.role === "admin" ? "accent" : u.role === "moderator" ? "muted" : "neutral"}>
                        {u.role === "admin" ? <Crown className="size-3" /> : u.role === "moderator" ? <ShieldCheck className="size-3" /> : <UserRound className="size-3" />}
                        {roleLabel(u.role)}
                      </Badge>
                      {u.suspended && <Badge variant="warning"><ShieldAlert className="size-3" /> suspended</Badge>}
                      {isLastAdmin && <Badge variant="outline">protected — last admin</Badge>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">{u.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        setPending({ kind: "role", email: u.email, name: u.name, nextRole: v as AppRole })
                      }
                      disabled={!role.isAdmin || isLastAdmin}
                    >
                      <SelectTrigger className="w-36" aria-label={`Change role for ${u.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="owner">Gym owner</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant={u.suspended ? "soft" : "danger"}
                      disabled={u.isSelf || isLastAdmin || (u.suspended && !role.isAdmin)}
                      onClick={() =>
                        setPending({ kind: "suspend", email: u.email, name: u.name, suspend: !u.suspended })
                      }
                    >
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted">
          Promote/demote and unsuspend are admin-only. Moderators may suspend members but never
          staff, and nobody may demote, suspend, or delete the final admin.
        </p>

        {/* Reason dialog — required for every privileged change */}
        <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setReason(""); } }}>
          <DialogContent
            title={
              pending?.kind === "role"
                ? `Change ${pending.name} to ${roleLabel(pending.nextRole)}`
                : pending?.suspend
                  ? `Suspend ${pending?.name}`
                  : `Unsuspend ${pending?.name}`
            }
            description="A reason is mandatory and will be stored in the audit log with your name, the time, and a hashed IP."
          >
            <form
              onSubmit={(e) => { e.preventDefault(); act.mutate(); }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Reason</label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Repeated spam listings after warning"
                  autoFocus
                />
                {reason.trim().length > 0 && reason.trim().length < 5 && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">At least 5 characters.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setPending(null); setReason(""); }}>
                  Cancel
                </Button>
                <Button type="submit" loading={act.isPending} disabled={reason.trim().length < 5}>
                  Confirm & log
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

/*
 * app/admin/users/page.tsx — user management (ADMIN ONLY).
 * Why: the matrix gives admins alone the power to promote/demote and to
 * unsuspend. Every destructive action demands a written reason that is
 * recorded in the audit log alongside the actor and timestamp. The last
 * remaining admin cannot be demoted or suspended — the UI disables it and
 * the API refuses it, mirroring the database trigger.
 */
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Pencil, Search, ShieldAlert, ShieldCheck, Trash2, UserRound, UserPlus, Undo2 } from "lucide-react";
import { Field, Textarea } from "@/components/ui/field";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useDemoUsers } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { roleLabel } from "@/lib/demo-accounts";
import { cn } from "@/lib/utils";
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
  | { kind: "suspend"; email: string; name: string; suspend: boolean }
  | { kind: "add" }
  | { kind: "edit"; email: string; name: string }
  | { kind: "delete"; email: string; name: string }
  | { kind: "restore"; email: string; name: string };

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const role = useRole();
  const [q, setQ] = useState("");
  const { data: users, isLoading } = useDemoUsers(q);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [addForm, setAddForm] = useState({ email: "", name: "", role: "member" as AppRole });
  const [editForm, setEditForm] = useState({ name: "", city: "", rank: "", bio: "" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["demo-users"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const act = useMutation({
    mutationFn: async () => {
      if (!pending) return;
      if (pending.kind === "role") return api.setUserRole(pending.email, pending.nextRole, reason);
      if (pending.kind === "add")
        return api.adminAddUser({ ...addForm, email: addForm.email.trim().toLowerCase(), reason }).then(() => undefined);
      if (pending.kind === "edit")
        return api.adminEditUserProfile({ email: pending.email, ...editForm, reason }).then(() => undefined);
      if (pending.kind === "delete") return api.adminDeleteUser(pending.email, reason).then(() => undefined);
      if (pending.kind === "restore") return api.adminRestoreUser(pending.email, reason).then(() => undefined);
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

  // deleted accounts (demo registry tracking)
  const [deletedEmails, setDeletedEmails] = useState<string[]>([]);
  useEffect(() => {
    import("@/lib/storage").then((m) => setDeletedEmails(m.getDeletedAccounts()));
  }, [q, pending]);
  const labelDeleted = (email: string) => deletedEmails.includes(email);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Search accounts, review role and status, and apply changes. Every change requires a reason and is written to the audit log."
          action={
            <Button onClick={() => { setAddForm({ email: "", name: "", role: "member" }); setReason(""); setPending({ kind: "add" }); }}>
              <UserPlus className="size-4" /> Add user
            </Button>
          }
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

        {(deletedEmails ?? []).length > 0 && role.isAdmin && (
          <p className="rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
            {(deletedEmails ?? []).length} account(s) deleted: {deletedEmails.join(", ")}.
            Deleted accounts cannot sign in. Restore them from the same row actions if needed.
          </p>
        )}

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
                      variant="secondary"
                      disabled={!role.isAdmin}
                      aria-label={`Edit ${u.name}'s profile`}
                      onClick={() => {
                        setEditForm({ name: u.name, city: "", rank: "", bio: "" });
                        setReason("");
                        setPending({ kind: "edit", email: u.email, name: u.name });
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
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
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={u.isSelf || isLastAdmin || !role.isAdmin}
                      aria-label={`${labelDeleted(u.email) ? "Restore" : "Delete"} ${u.name}`}
                      onClick={() => {
                        setReason("");
                        setPending({
                          kind: labelDeleted(u.email) ? "restore" : "delete",
                          email: u.email, name: u.name,
                        });
                      }}
                    >
                      {labelDeleted(u.email) ? <Undo2 className="size-4" /> : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Role reference — what each role can do (mirrors section 4A caps) */}
        <Card className="p-5">
          <p className="text-sm font-semibold tracking-tight">What each role unlocks</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { role: "Member", items: ["Browse directory & open mats", "Request to roll (10/day)", "Private notebook", "Submit gyms & mats"] },
              { role: "Gym owner", items: ["Everything a member does", "Edit their claimed listing", "Manage mats at their gym"] },
              { role: "Moderator", items: ["Review submissions & claims", "Handle reports", "Suspend members", "Summary analytics"] },
              { role: "Admin", items: ["Everything above", "Users: add · edit · suspend · roles", "Unsuspend & restore", "Audit log & full analytics"] },
            ].map((r) => (
              <div key={r.role} className="rounded-sm border border-border p-3">
                <p className={cn("text-xs font-bold uppercase tracking-wide", r.role === "Admin" ? "text-accent" : "text-muted")}>
                  {r.role}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {r.items.map((i) => <li key={i}>· {i}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            This panel mirrors the database rules 1:1 — hiding a control in the UI is never the
            security boundary; every action re-checks the role server-side.
          </p>
        </Card>

        {/* Reason dialog — required for every privileged change */}
        <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setReason(""); } }}>
          <DialogContent
            title={
              pending?.kind === "add" ? "Add a user"
              : pending?.kind === "edit" ? `Edit ${pending.name}'s profile`
              : pending?.kind === "delete" ? `Delete ${pending.name}?`
              : pending?.kind === "restore" ? `Restore ${pending.name}`
              : pending?.kind === "role" ? `Change ${pending?.name} to ${roleLabel(pending.nextRole)}`
              : pending?.suspend ? `Suspend ${pending?.name}` : `Unsuspend ${pending?.name}`
            }
            description="A reason is mandatory and will be stored in the audit log with your name, the time, and a hashed IP."
          >
            <form
              onSubmit={(e) => { e.preventDefault(); act.mutate(); }}
              className="space-y-4"
            >
              {pending?.kind === "add" && (
                <>
                  <Field label="Full name">
                    {(id) => (
                      <Input id={id} autoFocus value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        placeholder="Riley Tanaka" />
                    )}
                  </Field>
                  <Field label="Email">
                    {(id) => (
                      <Input id={id} type="email" value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        placeholder="new.member@choque.dev" />
                    )}
                  </Field>
                  <Field label="Role">
                    {(id) => (
                      <select id={id} value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value as AppRole })}
                        className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10">
                        <option value="member">Member</option>
                        <option value="owner">Gym owner</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </Field>
                </>
              )}
              {pending?.kind === "edit" && (
                <>
                  <Field label="Display name">
                    {(id) => (
                      <Input id={id} autoFocus value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    )}
                  </Field>
                  <Field label="City">
                    {(id) => (
                      <Input id={id} value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Leave blank to keep current" />
                    )}
                  </Field>
                  <Field label="Belt / level">
                    {(id) => (
                      <Input id={id} value={editForm.rank}
                        onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                        placeholder="e.g. BJJ blue belt" />
                    )}
                  </Field>
                  <Field label="Bio">
                    {(id) => (
                      <Textarea id={id} rows={3} value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
                    )}
                  </Field>
                </>
              )}
              {pending?.kind === "delete" && (
                <p className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
                  This removes {pending.name}&apos;s ability to sign in and hides their account.
                  It is reversible via Restore, and the reason you enter is logged.
                </p>
              )}
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
                <Button
                  type="submit"
                  variant={pending?.kind === "delete" ? "danger" : "primary"}
                  loading={act.isPending}
                  disabled={reason.trim().length < 5}
                >
                  {pending?.kind === "add" ? "Create user"
                   : pending?.kind === "edit" ? "Save profile"
                   : pending?.kind === "delete" ? "Delete account"
                   : pending?.kind === "restore" ? "Restore account" : "Confirm & log"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

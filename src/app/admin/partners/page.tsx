/*
 * app/admin/partners/page.tsx — practitioner management (staff).
 * Why: staff maintain the partner directory too — adding a known local
 * practitioner, correcting a rank/city, or removing a spam profile. Full
 * add/edit/delete with mandatory, audited reasons. Reads come from the same
 * editable directory overlay the partner search uses, so edits are live
 * everywhere instantly.
 */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { usePartners } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";

type Mode =
  | { kind: "add" }
  | { kind: "edit"; slug: string; name: string }
  | { kind: "delete"; slug: string; name: string };

const empty = { name: "", city: "", rank: "", bio: "", weightKg: "70", availability: "Evening" };

export default function AdminPartnersPage() {
  const qc = useQueryClient();
  const role = useRole();
  const { data: partners, isLoading } = usePartners({});

  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [reason, setReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["partners"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, city: form.city, rank: form.rank, bio: form.bio,
        weightKg: Number(form.weightKg) || 70,
        availability: [form.availability],
      };
      if (mode?.kind === "add") return api.adminCreatePartner(payload, reason);
      if (mode?.kind === "edit") return api.adminUpdatePartner(mode.slug, payload, reason);
      throw new Error("Nothing to save");
    },
    onSuccess: () => { invalidate(); toast.success("Practitioner saved & logged"); setMode(null); setReason(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const del = useMutation({
    mutationFn: () => (mode?.kind === "delete" ? api.adminDeletePartner(mode.slug, reason) : Promise.resolve()),
    onSuccess: () => { invalidate(); toast.success("Practitioner deleted & logged"); setMode(null); setReason(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const rows = useMemo(() => partners ?? [], [partners]);
  const pending = save.isPending || del.isPending;

  if (!role.loading && !role.isStaff) {
    return <EmptyState icon={UserRound} title="Staff only" description="Practitioner management is restricted to moderators and admins." />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Partners"
          description="Add, edit or remove practitioner profiles. Every change needs a reason and is written to the audit log."
          action={
            <Button onClick={() => { setForm({ ...empty }); setReason(""); setMode({ kind: "add" }); }}>
              <Plus className="size-4" /> Add practitioner
            </Button>
          }
        />

        {isLoading ? (
          <Skeleton className="h-64 rounded-md" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No practitioners" description="Add one to seed the partner directory." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  {["Practitioner", "City", "Rank", "Availability", ""].map((h) => (
                    <th key={h} className="p-3 text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.slug} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                    <td className="p-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={p.name} size="sm" beltColor={p.beltColor} />
                        <span className="font-medium">{p.name}</span>
                        {p.verified && <Badge variant="accent">verified</Badge>}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{p.city}</td>
                    <td className="p-3 text-muted">{p.rank}</td>
                    <td className="p-3 text-muted">{p.availability.join(", ")}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name}`}
                          onClick={() => {
                            setForm({
                              name: p.name, city: p.city, rank: p.rank, bio: p.bio,
                              weightKg: String(p.weightKg), availability: p.availability[0] ?? "Evening",
                            });
                            setReason(""); setMode({ kind: "edit", slug: p.slug, name: p.name });
                          }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${p.name}`}
                          onClick={() => { setReason(""); setMode({ kind: "delete", slug: p.slug, name: p.name }); }}>
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Dialog open={!!mode} onOpenChange={(o) => { if (!o) { setMode(null); setReason(""); } }}>
          <DialogContent
            title={mode?.kind === "add" ? "Add a practitioner" : mode?.kind === "edit" ? `Edit ${mode.name}` : `Delete ${mode?.name}?`}
            description={mode?.kind === "delete" ? "This removes the profile from the partner directory. The reason is logged." : "Changes publish instantly across the app."}
          >
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); (mode?.kind === "delete" ? del : save).mutate(); }}
            >
              {mode?.kind !== "delete" && (
                <>
                  <Field label="Full name">
                    {(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riley Tanaka" />}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      {(id) => <Input id={id} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Portland" />}
                    </Field>
                    <Field label="Rank / level">
                      {(id) => <Input id={id} value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="BJJ blue belt" />}
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Weight (kg)">
                      {(id) => <Input id={id} type="number" min={0} value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />}
                    </Field>
                    <Field label="Availability">
                      {(id) => (
                        <select id={id} value={form.availability}
                          onChange={(e) => setForm({ ...form, availability: e.target.value })}
                          className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10">
                          <option>Morning</option><option>Midday</option><option>Evening</option>
                        </select>
                      )}
                    </Field>
                  </div>
                  <Field label="Bio">
                    {(id) => <Textarea id={id} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />}
                  </Field>
                </>
              )}
              <Field label="Reason (required)">
                {(id) => (
                  <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder={mode?.kind === "delete" ? "e.g. spam profile" : "e.g. corrected rank after verification"} />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setMode(null); setReason(""); }}>Cancel</Button>
                <Button type="submit" variant={mode?.kind === "delete" ? "danger" : "primary"}
                  loading={pending} disabled={reason.trim().length < 5}>
                  {mode?.kind === "delete" ? "Delete & log" : "Save & log"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

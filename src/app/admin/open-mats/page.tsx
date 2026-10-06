/*
 * app/admin/open-mats/page.tsx — open-mat management (staff).
 * Why: staff need full add/edit/delete over the open-mat directory, not just
 * a review queue. This table lists every mat with its host, schedule and
 * fee, and offers inline create/edit/delete — each action requires a reason
 * and is written to the audit log. Reading comes from the editable directory
 * overlay, so changes appear instantly across the whole app.
 */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useOpenMats } from "@/lib/hooks";
import type { MatLevel } from "@/lib/types";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState, Skeleton } from "@/components/ui/misc";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Mode =
  | { kind: "add" }
  | { kind: "edit"; id: string }
  | { kind: "delete"; id: string; title: string };

const empty = {
  gymId: "", title: "", weekday: "6", start: "10:00", end: "12:00",
  level: "All levels" as MatLevel, fee: "15", hostName: "",
  visitorRequirements: "", notes: "",
};

export default function AdminOpenMatsPage() {
  const qc = useQueryClient();
  const role = useRole();
  const { data: mats, isLoading } = useOpenMats({});
  const { data: gyms } = useQuery({ queryKey: ["admin-gyms"], queryFn: () => api.listGyms({ sort: "name" }) });

  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [reason, setReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mats"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        gymId: form.gymId, title: form.title, weekday: Number(form.weekday),
        start: form.start, end: form.end, level: form.level,
        fee: Number(form.fee) || 0, hostName: form.hostName,
        visitorRequirements: form.visitorRequirements, notes: form.notes,
      };
      if (mode?.kind === "add") return api.adminCreateMat(payload, reason);
      if (mode?.kind === "edit") return api.adminUpdateMat(mode.id, payload, reason);
      throw new Error("Nothing to save");
    },
    onSuccess: () => { invalidate(); toast.success("Open mat saved & logged"); setMode(null); setReason(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const del = useMutation({
    mutationFn: () => (mode?.kind === "delete" ? api.adminDeleteMat(mode.id, reason) : Promise.resolve()),
    onSuccess: () => { invalidate(); toast.success("Open mat deleted & logged"); setMode(null); setReason(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const rows = useMemo(() => mats ?? [], [mats]);
  const pending = save.isPending || del.isPending;

  if (!role.loading && !role.isStaff) {
    return <EmptyState icon={UserRound} title="Staff only" description="Open-mat management is restricted to moderators and admins." />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Open mats"
          description="Add, edit or remove any open mat. Every change needs a reason and is written to the audit log."
          action={
            <Button onClick={() => { setForm({ ...empty }); setReason(""); setMode({ kind: "add" }); }}>
              <Plus className="size-4" /> Add open mat
            </Button>
          }
        />

        {isLoading ? (
          <Skeleton className="h-64 rounded-md" />
        ) : rows.length === 0 ? (
          <EmptyState icon={CalendarCheck2} title="No open mats yet" description="Add one, or approve a member submission from the review queue." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  {["Title", "Host gym", "When", "Level", "Fee", ""].map((h) => (
                    <th key={h} className="p-3 text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                    <td className="p-3 font-medium">{m.title}</td>
                    <td className="p-3 text-muted">{m.gym.name} · {m.gym.city}</td>
                    <td className="p-3 text-muted">{DAYS[m.weekday]} {m.start}–{m.end}</td>
                    <td className="p-3"><Badge variant={m.level === "Competition" ? "warning" : "muted"}>{m.level}</Badge></td>
                    <td className="p-3">{m.fee === 0 ? "Free" : `$${m.fee}`}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${m.title}`}
                          onClick={() => {
                            setForm({
                              gymId: m.gymId, title: m.title, weekday: String(m.weekday),
                              start: m.start, end: m.end, level: m.level,
                              fee: String(m.fee), hostName: m.hostName,
                              visitorRequirements: m.visitorRequirements, notes: m.notes,
                            });
                            setReason(""); setMode({ kind: "edit", id: m.id });
                          }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${m.title}`}
                          onClick={() => { setReason(""); setMode({ kind: "delete", id: m.id, title: m.title }); }}>
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
            title={mode?.kind === "add" ? "Add an open mat" : mode?.kind === "edit" ? `Edit ${form.title || "open mat"}` : `Delete ${mode?.title}?`}
            description={mode?.kind === "delete" ? "This removes it from the directory immediately. The reason is logged." : "Every field is editable; changes publish instantly."}
            className="max-w-xl"
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                (mode?.kind === "delete" ? del : save).mutate();
              }}
            >
              {mode?.kind !== "delete" && (
                <>
                  <Field label="Title">
                    {(id) => <Input id={id} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Saturday open mat" />}
                  </Field>
                  <Field label="Host gym">
                    {(id) => (
                      <select id={id} value={form.gymId} required
                        onChange={(e) => setForm({ ...form, gymId: e.target.value })}
                        className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10">
                        <option value="">Choose a gym…</option>
                        {(gyms ?? []).map((g) => <option key={g.id} value={g.id}>{g.name} — {g.city}</option>)}
                      </select>
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Day">
                      {(id) => (
                        <select id={id} value={form.weekday}
                          onChange={(e) => setForm({ ...form, weekday: e.target.value })}
                          className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10">
                          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="Level">
                      {(id) => (
                        <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as typeof form.level })}>
                          <SelectTrigger id={id} aria-label="Level"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All levels">All levels</SelectItem>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Competition">Competition</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Starts">{(id) => <Input id={id} type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />}</Field>
                    <Field label="Ends">{(id) => <Input id={id} type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />}</Field>
                    <Field label="Fee ($)">{(id) => <Input id={id} type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />}</Field>
                  </div>
                  <Field label="Host name">
                    {(id) => <Input id={id} value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} placeholder="Who runs it" />}
                  </Field>
                  <Field label="Visitor requirements">
                    {(id) => <Input id={id} value={form.visitorRequirements} onChange={(e) => setForm({ ...form, visitorRequirements: e.target.value })} placeholder="Gi, wraps, shoes…" />}
                  </Field>
                  <Field label="Notes">
                    {(id) => <Textarea id={id} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
                  </Field>
                </>
              )}
              <Field label="Reason (required)">
                {(id) => (
                  <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder={mode?.kind === "delete" ? "e.g. duplicated listing" : "e.g. host moved the session to 11:00"} />
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

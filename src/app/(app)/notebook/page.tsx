/*
 * app/(app)/notebook/page.tsx — the private training notebook.
 * Why: CHOQUE's most personal surface now with the spec'd interactions:
 * dnd-kit drag-to-reorder with framer layout animation (order persists to
 * localStorage), a chip-style technique editor whose tags animate in and out
 * (AnimatePresence + popLayout), streak/volume stats, search, type filter,
 * JSON export, and undoable deletes. Owner-only, always: data lives only in
 * this browser.
 */
"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Clock,
  Download,
  Dumbbell,
  Flame,
  GripVertical,
  NotebookPen,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Trash2,
  Wrench,
  X,
  CloudOff,
  Copy,
  Eye,
  FolderPlus,
  Pin,
  Video,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useNotebook } from "@/lib/hooks";
import type { NotebookEntry, SessionType } from "@/lib/types";
import { cn, formatDate, plural } from "@/lib/utils";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Dropdown, DropdownButton, DropdownContent, DropdownItem, DropdownTrigger,
} from "@/components/ui/misc";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EASE_OUT } from "@/lib/motion";
import { Markdown, MarkdownToolbar } from "@/components/markdown";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { useCollections } from "@/lib/hooks";
import { StreakHeatmap } from "@/components/streak-heatmap";
import type { Collection, NoteLink } from "@/lib/types";

const TYPE_META: Record<SessionType, { label: string; badge: "accent" | "neutral" | "success" | "warning" }> = {
  class: { label: "Class", badge: "neutral" },
  "open-mat": { label: "Open mat", badge: "accent" },
  drilling: { label: "Drilling", badge: "success" },
  competition: { label: "Competition", badge: "warning" },
};

/* ———————————————— Editor ———————————————— */
const entrySchema = z.object({
  date: z.string().min(1, "Pick a date"),
  type: z.enum(["class", "open-mat", "drilling", "competition"]),
  title: z.string().min(2, "Give the session a title").max(80),
  rounds: z.coerce.number().int().min(0).max(30).default(0),
  minutes: z.coerce.number().int().min(5, "At least 5 minutes").max(600),
  intensity: z.coerce.number().int().min(1).max(5).default(3),
  worked: z.string().max(160).default(""),
  fix: z.string().max(160).default(""),
  notes: z.string().max(4000).default(""),
  position: z.string().max(60).default(""),
  topic: z.string().max(60).default(""),
});
type EntryFormValues = z.input<typeof entrySchema>;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Chip editor: techniques become animated tags. Enter or comma commits. */
function TechniqueChips({
  value,
  onChange,
  inputId,
  describedBy,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  inputId: string;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const parts = draft.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setDraft("");
  };

  return (
    <div className="rounded-sm border border-border bg-surface p-2 shadow-1 transition-colors focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent">
      <div className="flex flex-wrap items-center gap-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {value.map((t1) => (
            <motion.span
              key={t1}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft pl-2.5 pr-1 py-1 text-xs font-medium text-accent"
            >
              {t1}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== t1))}
                className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-accent/15"
                aria-label={`Remove technique ${t1}`}
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              setDraft(v);
              setTimeout(commit, 0);
              return;
            }
            setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? "knee cut, juji gatame…" : "Add another…"}
          aria-describedby={describedBy}
          className="h-9 min-w-32 flex-1 bg-transparent px-1.5 text-sm text-foreground placeholder:text-muted/70 focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

/** Pre-built note structures (section 6): filling, not form-filling. */
const NOTE_TEMPLATES: { id: string; label: string; title: string; type: SessionType; body: string }[] = [
  { id: "blank", label: "Blank", title: "", type: "open-mat", body: "" },
  {
    id: "position", label: "Position breakdown", title: "Position breakdown", type: "drilling",
    body: "**Position:** \n**Goal:** \n\n## Entry\n- \n\n## Controls and frames\n- \n\n## Submissions / finishes\n- \n\n## Escapes and counters\n- \n\n> What kills this position for me, and why?",
  },
  {
    id: "roll", label: "Roll review", title: "Roll review", type: "open-mat",
    body: "**Rounds:** \n**Partners:** \n\n## What worked\n- \n\n## What I failed at\n- \n\n## One small fix for tomorrow\n\n> Energy and pace notes:",
  },
  {
    id: "comp", label: "Competition plan", title: "Competition plan", type: "competition",
    body: "**Event:** \n**Weight class:** \n**First match goal:** \n\n## Game plan A (top)\n1. \n\n## Game plan B (bottom)\n1. \n\n## Ruleset notes\n- \n\n## Cut / nutrition\n- \n\n## Week-of checklist\n- [ ] Taper rounds\n- [ ] Pack\n- [ ] Sleep",
  },
];

/** Paste a YouTube URL → parsed chip with optional start time. */
function VideoAttacher({
  links, onChange,
}: {
  links: NoteLink[];
  onChange: (next: NoteLink[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!draft.trim()) return;
    const parsed = api.parseYouTube(draft);
    if (!parsed) {
      setError("That doesn't look like a YouTube link.");
      return;
    }
    if (links.some((l) => l.youtubeId === parsed.youtubeId && l.startSeconds === parsed.startSeconds)) {
      setError("That video is already attached.");
      return;
    }
    onChange([...links, parsed]);
    setDraft("");
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="https://youtu.be/… (t=90 keeps the timestamp)"
          aria-label="YouTube URL"
          aria-invalid={!!error}
        />
        <Button type="button" variant="secondary" onClick={add}>
          <Video className="size-4" /> Attach
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id}>
              <YouTubeEmbed link={l} onRemove={() => onChange(links.filter((x) => x.id !== l.id))} />
              <label className="mt-1 flex items-center gap-2">
                <span className="sr-only">Label for this timestamp</span>
                <input
                  defaultValue={l.title}
                  onBlur={(e) =>
                    onChange(links.map((x) => (x.id === l.id ? { ...x, title: e.target.value } : x)))
                  }
                  placeholder={
                    l.startSeconds
                      ? `Note for ${Math.floor(l.startSeconds / 60)}:${String(l.startSeconds % 60).padStart(2, "0")} — e.g. "the grip break"`
                      : "Note for this video — e.g. 'the entry detail'"
                  }
                  className="h-9 w-full rounded-sm border border-border bg-surface px-2.5 text-xs shadow-1 placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryEditor({ entry, onClose }: { entry?: NotebookEntry | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [techniques, setTechniques] = useState<string[]>(entry?.techniques ?? []);
  const [links, setLinks] = useState<NoteLink[]>(entry?.links ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(entry?.collectionIds ?? []);
  const [preview, setPreview] = useState(false);
  const [template, setTemplate] = useState("blank");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: collections } = useCollections();

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: entry
      ? {
          date: entry.date, type: entry.type, title: entry.title,
          rounds: entry.rounds, minutes: entry.minutes, intensity: entry.intensity,
          worked: entry.worked, fix: entry.fix, notes: entry.notes,
          position: entry.position ?? "", topic: entry.topic ?? "",
        }
      : { date: todayISO(), type: "open-mat", intensity: 3, rounds: 0, position: "", topic: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const payload = {
        date: values.date,
        type: values.type as SessionType,
        title: values.title,
        techniques,
        rounds: Number(values.rounds ?? 0),
        minutes: Number(values.minutes),
        intensity: Number(values.intensity ?? 3) as 1 | 2 | 3 | 4 | 5,
        worked: values.worked ?? "",
        fix: values.fix ?? "",
        notes: values.notes ?? "",
        position: values.position ?? "",
        topic: values.topic ?? "",
        collectionIds,
        links,
        pinned: entry?.pinned ?? false,
      };
      return entry ? api.updateEntry(entry.id, payload) : api.createEntry(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook"] });
      setSavedAt(new Date().toLocaleTimeString());
      toast.success(entry ? "Entry updated" : "Session logged");
      onClose();
    },
    onError: () => toast.error("Couldn't save. Try again."),
  });

  const intensity = form.watch("intensity");

  function applyTemplate(id: string) {
    const t = NOTE_TEMPLATES.find((x) => x.id === id);
    if (!t || t.id === "blank") return;
    setTemplate(id);
    form.setValue("title", t.title, { shouldDirty: true });
    form.setValue("type", t.type, { shouldDirty: true });
    form.setValue("notes", t.body.replace(/\\n/g, "\n"), { shouldDirty: true });
  }

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      {!entry && (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Start from a template</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Note templates">
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={template === t.id}
                onClick={() => applyTemplate(t.id)}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-xs font-medium transition-all active:scale-95",
                  template === t.id
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={form.formState.errors.date?.message}>
          {(id, describedBy) => <Input id={id} type="date" max={todayISO()} aria-describedby={describedBy} {...form.register("date")} />}
        </Field>
        <Field label="Session type">
          {(id) => (
            <Select
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as SessionType, { shouldDirty: true })}
            >
              <SelectTrigger id={id} aria-label="Session type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as SessionType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <Field label="Title" error={form.formState.errors.title?.message}>
        {(id, describedBy) => (
          <Input id={id} placeholder="e.g. Guard retention rounds with Ana" aria-describedby={describedBy} {...form.register("title")} />
        )}
      </Field>

      <Field label="Techniques" hint="Press Enter or comma to add a chip.">
        {(id, describedBy) => (
          <TechniqueChips value={techniques} onChange={setTechniques} inputId={id} describedBy={describedBy} />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rounds" error={form.formState.errors.rounds?.message}>
          {(id, describedBy) => <Input id={id} type="number" min={0} max={30} aria-describedby={describedBy} {...form.register("rounds")} />}
        </Field>
        <Field label="Minutes" error={form.formState.errors.minutes?.message}>
          {(id, describedBy) => <Input id={id} type="number" min={5} step={5} aria-describedby={describedBy} {...form.register("minutes")} />}
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Intensity</span>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Session intensity from 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Number(intensity) === n}
              onClick={() => form.setValue("intensity", n, { shouldDirty: true })}
              className={cn(
                "h-10 rounded-sm border text-sm font-medium transition-all cursor-pointer active:scale-95",
                Number(intensity) === n
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-muted/60 hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Field label="One thing that worked">
        {(id) => <Input id={id} placeholder="Framing with the shoulder, not the forearm" {...form.register("worked")} />}
      </Field>
      <Field label="One thing to fix">
        {(id) => <Input id={id} placeholder="Fighting hands too low in the clinch" {...form.register("fix")} />}
      </Field>

      {/* Position / topic — the two axes notes get filtered by */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Position" hint="half guard, standing…">
          {(id, d) => <Input id={id} aria-describedby={d} placeholder="half guard" {...form.register("position")} />}
        </Field>
        <Field label="Topic" hint="sweeps, escapes…">
          {(id, d) => <Input id={id} aria-describedby={d} placeholder="escapes" {...form.register("topic")} />}
        </Field>
      </div>

      {/* Collections (folders) */}
      {(collections ?? []).length > 0 && (
        <Field label="Collections">
          {(id) => (
            <div id={id} className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Collections">
              {(collections ?? []).map((c: Collection) => {
                const on = collectionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCollectionIds((cur) => on ? cur.filter((x) => x !== c.id) : [...cur, c.id])}
                    className={cn(
                      "h-9 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
                      on ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:border-muted/60",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {/* Markdown body with live preview toggle */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium">Notes</span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Eye className="size-3.5" /> {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-32 rounded-sm border border-border bg-background/50 p-3">
            {form.watch("notes")?.trim()
              ? <Markdown source={form.watch("notes") ?? ""} />
              : <p className="text-sm text-muted">Nothing to preview yet.</p>}
          </div>
        ) : (
          <>
            <MarkdownToolbar
              textareaRef={bodyRef}
              onChange={(next) => form.setValue("notes", next, { shouldDirty: true })}
            />
            <Textarea
              rows={6}
              className="rounded-t-none"
              placeholder={"Grips, sequences, who gave you trouble.\n\n**Bold**, *italic*, `code`, - lists"}
              {...form.register("notes")}
              ref={(el) => { form.register("notes").ref(el); bodyRef.current = el; }}
            />
          </>
        )}
      </div>

      {/* YouTube attachments */}
      <div>
        <span className="mb-1.5 block text-sm font-medium">Video references</span>
        <VideoAttacher links={links} onChange={setLinks} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {savedAt && (
          <span className="mr-auto inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> Saved {savedAt}
          </span>
        )}
        {!api.isOnline() && (
          <span className="mr-auto inline-flex items-center gap-1 text-xs text-warning">
            <CloudOff className="size-3.5" /> Offline — changes queue and sync later
          </span>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>
          {entry ? "Save changes" : "Log session"}
        </Button>
      </div>
    </form>
  );
}

/* ———————————————— Stats ———————————————— */
function computeStats(entries: NotebookEntry[]) {
  const totalRounds = entries.reduce((s, e) => s + e.rounds, 0);
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const days = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;
  if (days.length) {
    const cursor = new Date(todayISO() + "T00:00:00");
    if (days[0] !== todayISO()) cursor.setDate(cursor.getDate() - 1);
    for (const day of days) {
      const expected = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (day === expected) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else if (day < expected) break;
    }
  }
  return { totalRounds, totalMinutes, thisMonth, streak };
}

/* ———————————————— Sortable card ———————————————— */
function SortableEntry({
  entry, dragDisabled, onEdit, onDelete, onPin, onDuplicate,
}: {
  entry: NotebookEntry;
  dragDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: dragDisabled,
  });

  return (
    <motion.li
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-20")}
    >
      <Card className={cn("p-5 transition-shadow hover:shadow-2", isDragging && "shadow-2 ring-2 ring-accent/40")}>
        <div className="flex items-start gap-2">
          {!dragDisabled && (
            <button
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder "${entry.title}"`}
              className="mt-1 flex size-11 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-accent lg:size-9"
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{formatDate(entry.date)}</p>
                <h3 className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
                  {entry.pinned && <Pin className="size-4 shrink-0 fill-accent text-accent" aria-label="Pinned" />}
                  {entry.title}
                  <Badge variant={TYPE_META[entry.type].badge}>{TYPE_META[entry.type].label}</Badge>
                  {entry.position && <Badge variant="outline">{entry.position}</Badge>}
                  {entry.topic && <Badge variant="outline">{entry.topic}</Badge>}
                </h3>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span>{plural(entry.rounds, "round")}</span>
                  <span>{entry.minutes} min</span>
                  <span>Intensity {entry.intensity}/5</span>
                </p>
              </div>
              <Dropdown>
                <DropdownButton label={`Actions for "${entry.title}"`} />
                <DropdownContent>
                  <DropdownItem onSelect={onEdit}><Pencil /> Edit</DropdownItem>
                  <DropdownItem onSelect={onPin}>
                    <Pin /> {entry.pinned ? "Unpin" : "Pin to top"}
                  </DropdownItem>
                  <DropdownItem onSelect={onDuplicate}><Copy /> Duplicate</DropdownItem>
                  <DropdownItem data-variant="danger" onSelect={onDelete}><Trash2 /> Delete</DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>

            {entry.techniques.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.techniques.map((t) => (
                  <Badge key={t} variant="muted"><Dumbbell className="size-3" /> {t}</Badge>
                ))}
              </div>
            )}

            {(entry.worked || entry.fix) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {entry.worked && (
                  <p className="flex items-start gap-2 rounded-sm bg-success/10 px-3 py-2 text-xs text-success">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> {entry.worked}
                  </p>
                )}
                {entry.fix && (
                  <p className="flex items-start gap-2 rounded-sm bg-warning/10 px-3 py-2 text-xs text-warning">
                    <Wrench className="mt-0.5 size-3.5 shrink-0" /> {entry.fix}
                  </p>
                )}
              </div>
            )}

            {entry.notes && (
              <div className="mt-3 max-h-40 overflow-hidden text-muted">
                <Markdown source={entry.notes} />
              </div>
            )}

            {(entry.links ?? []).length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(entry.links ?? []).slice(0, 2).map((l) => <YouTubeEmbed key={l.id} link={l} />)}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.li>
  );
}

/* ———————————————— Page ———————————————— */
export default function NotebookPage() {
  const { data: entries, isLoading } = useNotebook();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NotebookEntry | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<SessionType | "all">("all");
  const [collectionId, setCollectionId] = useState("all");
  const [offline, setOffline] = useState(false);
  const { data: collections } = useCollections();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const deleteMutation = useMutation({
    mutationFn: api.deleteEntry,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["notebook"] });
      const removed = entries?.find((e) => e.id === id);
      toast("Entry deleted", {
        action: removed
          ? {
              label: "Undo",
              onClick: async () => {
                await api.createEntry({
                  date: removed.date, type: removed.type, title: removed.title,
                  techniques: removed.techniques, rounds: removed.rounds, minutes: removed.minutes,
                  intensity: removed.intensity, worked: removed.worked, fix: removed.fix, notes: removed.notes,
                });
                qc.invalidateQueries({ queryKey: ["notebook"] });
              },
            }
          : undefined,
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: api.reorderNotebook,
    onSettled: () => qc.invalidateQueries({ queryKey: ["notebook"] }),
  });

  const pinMutation = useMutation({
    mutationFn: api.togglePin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebook"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: api.duplicateEntry,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["notebook"] });
      toast.success(`Duplicated as “${c.title}”`);
    },
  });

  const newCollection = useMutation({
    mutationFn: (name: string) => api.createCollection(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create collection"),
  });

  // Offline queue: flush as soon as the browser reports connectivity.
  useEffect(() => {
    const onOnline = async () => {
      const n = await api.flushOutbox();
      if (n > 0) {
        qc.invalidateQueries({ queryKey: ["notebook"] });
        toast.success(`Synced ${n} offline change${n === 1 ? "" : "s"}`);
      }
      setOffline(false);
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOffline(!navigator.onLine);
    void onOnline();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    let out = entries ?? [];
    if (type !== "all") out = out.filter((e) => e.type === type);
    if (collectionId !== "all") out = out.filter((e) => (e.collectionIds ?? []).includes(collectionId));
    if (q) {
      const needle = q.toLowerCase();
      out = out.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.notes.toLowerCase().includes(needle) ||
          e.techniques.some((t) => t.toLowerCase().includes(needle)) ||
          (e.position ?? "").toLowerCase().includes(needle) ||
          (e.topic ?? "").toLowerCase().includes(needle),
      );
    }
    // Pinned notes always float to the top of whatever is showing.
    return [...out].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [entries, q, type, collectionId]);

  const stats = useMemo(() => computeStats(entries ?? []), [entries]);
  const dragDisabled = q !== "" || type !== "all" || collectionId !== "all";

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !entries) return;
    const ids = entries.map((x) => x.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    reorderMutation.mutate(arrayMove(ids, from, to));
  }

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };
  const exportJSON = () => download(api.exportNotebookJSON(), "choque-notebook.json", "application/json");
  const exportMarkdown = () => download(api.exportNotebookMarkdown(), "choque-notebook.md", "text/markdown");

  const hasAny = (entries?.length ?? 0) > 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Training notebook"
          description="Private by default — entries live only in this browser. Drag the grip handle to reorder."
          action={
            <div className="flex gap-2">
              {hasAny && (
                <Dropdown>
                  <DropdownTrigger asChild>
                    <Button variant="secondary"><Download className="size-4" /> Export</Button>
                  </DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem onSelect={exportMarkdown}>Markdown (.md)</DropdownItem>
                    <DropdownItem onSelect={exportJSON}>JSON (.json)</DropdownItem>
                  </DropdownContent>
                </Dropdown>
              )}
              <Dialog open={editorOpen} onOpenChange={(o) => { setEditorOpen(o); if (!o) setEditing(null); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditing(null)}><Plus className="size-4" /> New entry</Button>
                </DialogTrigger>
                <DialogContent
                  title={editing ? "Edit entry" : "New entry"}
                  description="Private. Ninety seconds now, a sharper game in six months."
                >
                  <EntryEditor entry={editing} onClose={() => { setEditorOpen(false); setEditing(null); }} />
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Flame, label: "Day streak", value: isLoading ? "—" : String(stats.streak), accent: true },
            { icon: NotebookPen, label: "Sessions this month", value: isLoading ? "—" : String(stats.thisMonth) },
            { icon: Repeat2, label: "Total rounds", value: isLoading ? "—" : String(stats.totalRounds) },
            { icon: Clock, label: "Hours logged", value: isLoading ? "—" : (stats.totalMinutes / 60).toFixed(1) },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <s.icon className={cn("size-3.5", s.accent && "text-accent")} /> {s.label}
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{s.value}</p>
            </Card>
          ))}
        </div>

        {!isLoading && hasAny && <StreakHeatmap entries={entries ?? []} />}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md" />)}
          </div>
        ) : !hasAny ? (
          <EmptyState
            icon={NotebookPen}
            title="Your notebook is empty"
            description="After your next session, log what you drilled, the rounds you survived, one thing that worked, and one thing to fix."
            action={
              <Button onClick={() => { setEditing(null); setEditorOpen(true); }}>
                <Plus className="size-4" /> Log your first session
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface p-3 shadow-1">
              <div className="relative min-w-52 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <label htmlFor="notebook-search" className="sr-only">Search entries</label>
                <input
                  id="notebook-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search titles, notes, techniques…"
                  className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm shadow-1 placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-10"
                />
              </div>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="w-full sm:w-36" aria-label="Filter by session type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(Object.keys(TYPE_META) as SessionType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by collection">
                  <SelectValue placeholder="Collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All collections</SelectItem>
                  {(collections ?? []).map((c: Collection) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={() => {
                  const name = window.prompt("Name this collection (e.g. Leglocks, Comp prep)");
                  if (name?.trim()) newCollection.mutate(name.trim());
                }}
              >
                <FolderPlus className="size-4" /> New collection
              </Button>
            </div>

            {offline && (
              <p role="status" className="flex items-center gap-2 rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <CloudOff className="size-4" />
                You&apos;re offline. Edits are queued in this browser and sync automatically when you reconnect
                {api.pendingWrites() > 0 ? ` (${api.pendingWrites()} waiting)` : ""}.
              </p>
            )}

            {dragDisabled && (
              <p className="text-xs text-muted" role="status">
                Reordering is paused while search or filters are active — clear them to drag entries.
              </p>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No entries match"
                description="Try a different search or clear the type filter."
                action={<Button variant="secondary" onClick={() => { setQ(""); setType("all"); }}>Reset</Button>}
              />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={filtered.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-3" aria-live="polite">
                    <AnimatePresence initial={false}>
                      {filtered.map((e) => (
                        <SortableEntry
                          key={e.id}
                          entry={e}
                          dragDisabled={dragDisabled}
                          onEdit={() => { setEditing(e); setEditorOpen(true); }}
                          onDelete={() => deleteMutation.mutate(e.id)}
                          onPin={() => pinMutation.mutate(e.id)}
                          onDuplicate={() => duplicateMutation.mutate(e.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}

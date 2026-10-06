/*
 * app/admin/gyms/page.tsx — gym management table (staff).
 * Why: spec 5.6 — a searchable, sortable table of every listing with inline
 * status, plus bulk import from CSV. The import parses in the browser,
 * validates each row, shows a preview with per-row errors, and only then
 * queues valid rows into the moderation queue as pending submissions — so a
 * bad paste can never corrupt the directory.
 */
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown, Building2, CheckCircle2, FileUp, Search, Upload,
} from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useGyms, useSubmissions } from "@/lib/hooks";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type SortKey = "name" | "city" | "rating" | "price";

interface CsvRow {
  line: number;
  name: string;
  city: string;
  description: string;
  dropIn: string;
  error?: string;
}

/** Minimal RFC-4180-ish parser: handles quoted fields and embedded commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

function CsvImport() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [open, setOpen] = useState(false);

  function handleFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const grid = parseCsv(String(reader.result ?? ""));
      if (grid.length === 0) { toast.error("That file looks empty"); return; }
      const [header, ...body] = grid;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
      const iName = idx("name"), iCity = idx("city"), iDesc = idx("description"), iFee = idx("drop_in");

      if (iName < 0 || iCity < 0) {
        toast.error("CSV needs at least `name` and `city` columns");
        return;
      }
      setRows(
        body.map((r, i) => {
          const name = r[iName] ?? "";
          const city = r[iCity] ?? "";
          let error: string | undefined;
          if (name.length < 3) error = "Name is too short";
          else if (!city) error = "City is required";
          return {
            line: i + 2,
            name, city,
            description: iDesc >= 0 ? (r[iDesc] ?? "") : "",
            dropIn: iFee >= 0 ? (r[iFee] ?? "") : "",
            error,
          };
        }),
      );
    };
    reader.readAsText(file);
  }

  const valid = (rows ?? []).filter((r) => !r.error);

  const importMutation = useMutation({
    mutationFn: async () => {
      for (const r of valid) {
        await api.createSubmission("gym", {
          title: r.name,
          summary: `${r.city}${r.dropIn ? ` · ${r.dropIn}` : ""} (CSV import)`,
          payload: { name: r.name, city: r.city, description: r.description, drop_in: r.dropIn, source: "csv" },
        });
      }
      return valid.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success(`${n} listing${n === 1 ? "" : "s"} queued for review`);
      setRows(null);
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRows(null); }}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Upload className="size-4" /> Bulk import CSV</Button>
      </DialogTrigger>
      <DialogContent
        title="Import gyms from CSV"
        description="Columns: name, city, description, drop_in. Valid rows enter the moderation queue as pending."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border px-6 py-10 text-center transition-colors hover:border-accent/50 hover:bg-accent-soft/20"
          >
            <FileUp className="size-6 text-accent" />
            <span className="text-sm font-medium">Choose a CSV file</span>
            <span className="text-xs text-muted">Parsed in your browser — nothing uploads until you confirm.</span>
          </button>

          {rows && (
            <>
              <p className="text-sm">
                <strong>{valid.length}</strong> valid ·{" "}
                <span className={cn((rows.length - valid.length) > 0 && "text-danger")}>
                  {rows.length - valid.length} with problems
                </span>
              </p>
              <div className="max-h-64 overflow-y-auto rounded-sm border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border">
                      <th className="p-2 font-medium text-muted">Line</th>
                      <th className="p-2 font-medium text-muted">Name</th>
                      <th className="p-2 font-medium text-muted">City</th>
                      <th className="p-2 font-medium text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-b border-border last:border-0">
                        <td className="p-2 font-mono text-muted">{r.line}</td>
                        <td className="p-2">{r.name || <span className="text-muted">—</span>}</td>
                        <td className="p-2">{r.city || <span className="text-muted">—</span>}</td>
                        <td className="p-2">
                          {r.error
                            ? <span className="text-danger">{r.error}</span>
                            : <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3" /> ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRows(null)}>Clear</Button>
                <Button
                  loading={importMutation.isPending}
                  disabled={valid.length === 0}
                  onClick={() => importMutation.mutate()}
                >
                  Queue {valid.length} listing{valid.length === 1 ? "" : "s"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminGymsPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const { data: gyms, isLoading } = useGyms({ sort: "name" });
  const { data: submissions } = useSubmissions(false);

  const pendingGyms = (submissions ?? []).filter((s) => s.kind === "gym" && s.status === "pending");

  const rows = useMemo(() => {
    let out = [...(gyms ?? [])];
    if (q) {
      const n = q.toLowerCase();
      out = out.filter((g) =>
        g.name.toLowerCase().includes(n) ||
        g.city.toLowerCase().includes(n) ||
        (g.neighborhood ?? "").toLowerCase().includes(n));
    }
    out.sort((a, b) => {
      switch (sort) {
        case "city": return a.city.localeCompare(b.city);
        case "rating": return b.rating - a.rating;
        case "price": return a.priceFrom - b.priceFrom;
        default: return a.name.localeCompare(b.name);
      }
    });
    return out;
  }, [gyms, q, sort]);

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="p-3">
      <button
        onClick={() => setSort(k)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground",
          sort === k ? "text-accent" : "text-muted",
        )}
        aria-label={`Sort by ${label}`}
      >
        {label} <ArrowUpDown className="size-3" />
      </button>
    </th>
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Gyms"
          description="Every listing in the directory. Search, sort, open a profile to edit, or bulk import."
          action={<CsvImport />}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="gym-admin-search" className="sr-only">Search gyms</label>
            <input
              id="gym-admin-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, city, or area…"
              className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm shadow-1 focus-visible:outline-2 focus-visible:outline-accent lg:h-10"
            />
          </div>
          {pendingGyms.length > 0 && (
            <Link href="/admin">
              <Badge variant="warning">{pendingGyms.length} awaiting review →</Badge>
            </Link>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-md" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <Th label="Name" k="name" />
                  <Th label="City" k="city" />
                  <Th label="Rating" k="rating" />
                  <Th label="From" k="price" />
                  <th className="p-3 text-xs font-medium text-muted">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-medium">
                        <Building2 className="size-4 shrink-0 text-muted" /> {g.name}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{g.neighborhood ?? g.city}, {g.state}</td>
                    <td className="p-3">{g.rating.toFixed(1)}</td>
                    <td className="p-3">${g.priceFrom}/mo</td>
                    <td className="p-3">
                      <Badge variant={g.verified ? "success" : "muted"}>
                        {g.verified ? "published" : "unverified"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/gyms/${g.slug}`}
                        className="text-xs font-medium text-accent underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <p className="text-xs text-muted">
          Showing {rows.length} of {(gyms ?? []).length} listings. Edits made by an approved gym owner
          or staff go live immediately; member suggestions enter the review queue.
        </p>
      </div>
    </PageTransition>
  );
}

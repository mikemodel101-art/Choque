/*
 * app/admin/notebook/page.tsx — staff notebook access point.
 * Why: the notebook is the one place where admin power deliberately stops.
 * Notes are owner-only by design — there is no staff read policy in the
 * database, and the test suite asserts that nobody (admins included) can read
 * another member's notes. This page gives staff full CRUD over their OWN
 * notebook and states that boundary in plain language, so the expectation is
 * explicit rather than silently missing.
 */
"use client";

import Link from "next/link";
import { NotebookPen, ShieldCheck } from "lucide-react";
import { useNotebook } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { StreakHeatmap } from "@/components/streak-heatmap";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function AdminNotebookPage() {
  const role = useRole();
  const { data: entries, isLoading } = useNotebook();

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="My notebook"
          description="Your own private training log — full add, edit, drag-to-reorder, duplicate and export."
        />

        <Card className="border-dashed p-5">
          <SectionTitle
            title="Why you can't see other members' notes"
            description="A deliberate boundary, enforced in the database"
          />
          <p className="mt-3 flex items-start gap-2.5 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            Notebooks are owner-only. The row-level security policy on the notes table has no staff
            or admin read path, so even a full administrator cannot open another member&apos;s
            notes — and the automated test suite asserts exactly that. Moderation powers cover
            listings, reports and accounts, never private training logs.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Your entries", value: isLoading ? "—" : String(entries?.length ?? 0) },
            { label: "Rounds logged", value: isLoading ? "—" : String((entries ?? []).reduce((s, e) => s + e.rounds, 0)) },
            { label: "Hours", value: isLoading ? "—" : ((entries ?? []).reduce((s, e) => s + e.minutes, 0) / 60).toFixed(1) },
            { label: "Collections", value: isLoading ? "—" : String(new Set((entries ?? []).flatMap((e) => e.collectionIds ?? [])).size) },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-medium text-muted">{s.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{s.value}</p>
            </Card>
          ))}
        </div>

        {!isLoading && (entries ?? []).length > 0 && <StreakHeatmap entries={entries ?? []} />}

        {(entries ?? []).length === 0 && !isLoading ? (
          <EmptyState
            icon={NotebookPen}
            title="Your notebook is empty"
            description="Open the notebook to log a session — markdown, YouTube timestamps, collections and templates are all there."
            action={<Link href="/notebook"><Button>Open my notebook</Button></Link>}
          />
        ) : (
          <Card className="divide-y divide-border">
            {(entries ?? []).slice(0, 8).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted">
                    {e.date} · {e.rounds} rounds · {e.minutes} min · intensity {e.intensity}/5
                  </p>
                </div>
                <Link
                  href="/notebook"
                  className="text-xs font-medium text-accent underline-offset-4 hover:underline"
                >
                  Edit in notebook
                </Link>
              </div>
            ))}
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/notebook"><Button>Open my notebook</Button></Link>
          {role.isStaff && (
            <Link href="/admin"><Button variant="secondary">Back to staff tools</Button></Link>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

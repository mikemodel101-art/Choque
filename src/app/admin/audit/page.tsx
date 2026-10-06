/*
 * app/admin/audit/page.tsx — audit log (ADMIN ONLY).
 * Why: every approval, rejection, suspension, role change, deletion and
 * listing edit must be reviewable after the fact. Entries carry the actor,
 * the action, the entity, the reason, and the timestamp. (In the Supabase
 * build, write_audit() also stores a SHA-256 hash of the caller's IP — never
 * the raw address.)
 */
"use client";

import { useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { useAuditLog } from "@/lib/hooks";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";

const LABEL: Record<string, string> = {
  "audit.suspension": "Suspension",
  "audit.role_change": "Role change",
  "audit.review": "Listing review",
  "audit.claim_review": "Ownership claim",
  "audit.report": "Report filed",
  "auth.sign_in": "Sign in",
  "auth.sign_out": "Sign out",
};

export default function AdminAuditPage() {
  const { data: entries, isLoading, error } = useAuditLog();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = entries ?? [];
    if (!q) return list;
    const needle = q.toLowerCase();
    return list.filter((e) => e.detail.toLowerCase().includes(needle) || e.type.includes(needle));
  }, [entries, q]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Audit log"
          description="Append-only record of privileged actions: actor, action, entity, reason, timestamp, hashed IP."
        />

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="audit-search" className="sr-only">Search audit entries</label>
          <input
            id="audit-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actions, emails, reasons…"
            className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm shadow-1 placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-10"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-40 rounded-md" />
        ) : error ? (
          <EmptyState
            icon={ScrollText}
            title="Not permitted"
            description="The audit log is restricted to admins. This check also runs server-side."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nothing logged yet"
            description="Approve a submission or change a user's status and the entry will appear here."
          />
        ) : (
          <Card className="divide-y divide-border">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-4">
                <ScrollText className="mt-0.5 size-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={e.type.startsWith("audit.") ? "accent" : "muted"}>
                      {LABEL[e.type] ?? e.type}
                    </Badge>
                    <span className="min-w-0 break-words">{e.detail}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted/80">
                    {new Date(e.at).toLocaleString()} · entity: {e.type.split(".")[0]} · ip: hashed
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

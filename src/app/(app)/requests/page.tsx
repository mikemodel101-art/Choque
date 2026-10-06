/*
 * app/(app)/requests/page.tsx — connection requests inbox (spec 5.4).
 * Why: connections are mutual. Incoming requests are accepted or declined
 * here; accepting unlocks the contact details BOTH sides chose to share
 * ("share-contact-on-accept" — there is no in-app chat in v1). Outgoing
 * requests show their state and can be withdrawn, and the daily rate-limit
 * budget is displayed so members know where they stand.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AtSign, Check, Clock, Handshake, Inbox, Mail, Send, ShieldOff, X,
} from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useBlocks, useConnectionBudget, useConnections } from "@/lib/hooks";
import { useRole } from "@/components/can";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Separator, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Connection } from "@/lib/types";

function ContactPanel({ c }: { c: Connection }) {
  if (!c.contact) return null;
  return (
    <div className="mt-3 rounded-sm border border-success/30 bg-success/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
        <Check className="size-3.5" /> Contact details unlocked — you both accepted
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {c.contact.email && (
          <li className="flex items-center gap-2">
            <Mail className="size-4 text-muted" />
            <a href={`mailto:${c.contact.email}`} className="text-accent underline-offset-4 hover:underline">
              {c.contact.email}
            </a>
          </li>
        )}
        {c.contact.instagram && (
          <li className="flex items-center gap-2">
            <AtSign className="size-4 text-muted" /> {c.contact.instagram}
          </li>
        )}
        {c.contact.preferred && (
          <li className="flex items-center gap-2 text-muted">
            <Clock className="size-4" /> {c.contact.preferred}
          </li>
        )}
      </ul>
    </div>
  );
}

function ConnectionRow({
  c, onRespond, onCancel, onBlock, pending,
}: {
  c: Connection;
  onRespond?: (accept: boolean) => void;
  onCancel?: () => void;
  onBlock?: () => void;
  pending?: boolean;
}) {
  const statusBadge =
    c.status === "accepted" ? <Badge variant="success">Connected</Badge>
    : c.status === "pending" ? <Badge variant="warning">Pending</Badge>
    : c.status === "declined" ? <Badge variant="muted">Declined</Badge>
    : <Badge variant="muted">Withdrawn</Badge>;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={c.partnerName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
            <Link href={`/partners/${c.partnerSlug}`} className="underline-offset-4 hover:text-accent hover:underline">
              {c.partnerName}
            </Link>
            {statusBadge}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {c.direction === "incoming" ? "Sent you a request" : "You requested"} ·{" "}
            {new Date(c.createdAt).toLocaleDateString()}
          </p>
          {c.message && <p className="mt-2 text-sm text-muted measure">“{c.message}”</p>}
          <ContactPanel c={c} />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {c.direction === "incoming" && c.status === "pending" && (
            <>
              <Button size="sm" loading={pending} onClick={() => onRespond?.(true)}>
                <Check className="size-4" /> Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onRespond?.(false)}>
                <X className="size-4" /> Decline
              </Button>
            </>
          )}
          {c.direction === "outgoing" && c.status === "pending" && (
            <Button size="sm" variant="secondary" onClick={onCancel}>Withdraw</Button>
          )}
          {onBlock && (
            <Button size="sm" variant="ghost" onClick={onBlock} aria-label={`Block ${c.partnerName}`}>
              <ShieldOff className="size-4" /> Block
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function RequestsPage() {
  const qc = useQueryClient();
  const role = useRole();
  const { data: connections, isLoading } = useConnections();
  const { data: budget } = useConnectionBudget();
  const { data: blocks } = useBlocks();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["connections"] });
    qc.invalidateQueries({ queryKey: ["blocks"] });
    qc.invalidateQueries({ queryKey: ["connection-budget"] });
  };

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api.respondToConnection(id, accept),
    onSuccess: (c) => {
      invalidate();
      toast.success(
        c.status === "accepted" ? `You're connected with ${c.partnerName}` : "Request declined",
        c.status === "accepted"
          ? { description: "Contact details are now visible to you both." }
          : { description: "They are not told who declined." },
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't respond"),
  });

  const cancel = useMutation({
    mutationFn: api.cancelConnection,
    onSuccess: () => { invalidate(); toast.success("Request withdrawn"); },
  });

  const block = useMutation({
    mutationFn: api.toggleBlock,
    onSuccess: (_d, slug) => {
      invalidate();
      toast.success("Blocked", { description: `You and ${slug.replace(/-/g, " ")} can no longer see each other.` });
    },
  });

  const incoming = useMemo(
    () => (connections ?? []).filter((c) => c.direction === "incoming" && c.status === "pending"),
    [connections],
  );
  const accepted = useMemo(() => (connections ?? []).filter((c) => c.status === "accepted"), [connections]);
  const outgoing = useMemo(
    () => (connections ?? []).filter((c) => c.direction === "outgoing" && c.status !== "accepted"),
    [connections],
  );

  const remaining = Math.max(0, 10 - (budget ?? 0));

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Requests"
          description="Connections are mutual — contact details are shared only after you both accept."
        />

        <div className="flex flex-wrap gap-3">
          <Card className="flex-1 p-4">
            <p className="text-xs font-medium text-muted">Awaiting your answer</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{incoming.length}</p>
          </Card>
          <Card className="flex-1 p-4">
            <p className="text-xs font-medium text-muted">Connected</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{accepted.length}</p>
          </Card>
          <Card className="flex-1 p-4">
            <p className="text-xs font-medium text-muted">Requests left today</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{remaining}<span className="text-sm font-normal text-muted">/10</span></p>
          </Card>
        </div>

        {!role.canConnect && role.signedIn && (
          <p role="status" className="rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
            Your account is suspended — you can read existing connections but cannot send or accept requests.
          </p>
        )}

        <Tabs defaultValue="incoming">
          <TabsList aria-label="Request views">
            <TabsTrigger value="incoming">Incoming{incoming.length > 0 ? ` (${incoming.length})` : ""}</TabsTrigger>
            <TabsTrigger value="connected">Connected{accepted.length > 0 ? ` (${accepted.length})` : ""}</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="blocked">Blocked{(blocks ?? []).length > 0 ? ` (${blocks!.length})` : ""}</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-5 space-y-3">
            {isLoading ? <Skeleton className="h-32 rounded-md" />
              : incoming.length === 0 ? (
                <EmptyState icon={Inbox} title="No pending requests"
                  description="When someone asks to train with you, it lands here for you to accept or decline." />
              ) : incoming.map((c) => (
                <ConnectionRow key={c.id} c={c}
                  pending={respond.isPending && respond.variables?.id === c.id}
                  onRespond={(accept) => respond.mutate({ id: c.id, accept })}
                  onBlock={() => block.mutate(c.partnerSlug)} />
              ))}
          </TabsContent>

          <TabsContent value="connected" className="mt-5 space-y-3">
            {accepted.length === 0 ? (
              <EmptyState icon={Handshake} title="No connections yet"
                description="Accept a request — or send one from a partner profile — to swap contact details." />
            ) : accepted.map((c) => (
              <ConnectionRow key={c.id} c={c} onBlock={() => block.mutate(c.partnerSlug)} />
            ))}
          </TabsContent>

          <TabsContent value="sent" className="mt-5 space-y-3">
            {outgoing.length === 0 ? (
              <EmptyState icon={Send} title="Nothing sent yet"
                description="Find someone at your weight and hours in Partners, then send a short intro." />
            ) : outgoing.map((c) => (
              <ConnectionRow key={c.id} c={c} onCancel={() => cancel.mutate(c.id)} />
            ))}
          </TabsContent>

          <TabsContent value="blocked" className="mt-5 space-y-3">
            {(blocks ?? []).length === 0 ? (
              <EmptyState icon={ShieldOff} title="Nobody blocked"
                description="Blocking hides you from each other everywhere — search, profiles, and requests." />
            ) : (
              <Card className="divide-y divide-border">
                {(blocks ?? []).map((slug) => (
                  <div key={slug} className="flex items-center gap-3 p-4">
                    <Avatar name={slug.replace(/-/g, " ")} size="sm" />
                    <span className="flex-1 text-sm capitalize">{slug.replace(/-/g, " ")}</span>
                    <Button size="sm" variant="secondary" onClick={() => block.mutate(slug)}>Unblock</Button>
                  </div>
                ))}
              </Card>
            )}
            <Separator className="my-4" />
            <p className="flex items-start gap-2 text-xs text-muted">
              <AtSign className="mt-0.5 size-3.5 shrink-0" />
              Blocked practitioners cannot see your profile, find you in search, or send requests — and
              you will not see them either.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

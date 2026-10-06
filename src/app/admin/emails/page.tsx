/*
 * app/admin/emails/page.tsx — transactional email previews (staff).
 * Why: spec 5.8 lists seven lifecycle emails. Rather than describe them in a
 * document, staff can read the exact subject, plain-text and HTML output of
 * each template here — the same renderEmail() the sending code calls, so the
 * preview can never drift from what members actually receive.
 */
"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ALL_EMAIL_KINDS, renderEmail, type EmailKind } from "@/lib/emails";
import { PageHeader } from "@/components/filters";
import { PageTransition } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SAMPLE = {
  name: "Riley",
  actionUrl: "https://choque.app/verify?token=sample",
  partnerName: "Sofia Marchetti",
  listingName: "Barton Springs BJJ",
  reason: "We couldn't verify this address with the academy.",
};

export default function AdminEmailsPage() {
  const [kind, setKind] = useState<EmailKind>("welcome");
  const [mode, setMode] = useState<"html" | "text">("html");
  const email = renderEmail(kind, SAMPLE);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Email templates"
          description="Exactly what members receive. Rendered from the same function the sender uses."
        />

        <div className="flex flex-wrap gap-1.5">
          {ALL_EMAIL_KINDS.map((k) => {
            const label = renderEmail(k, SAMPLE).label;
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-xs font-medium transition-all active:scale-95",
                  kind === k
                    ? "border-accent bg-accent text-white shadow-1"
                    : "border-border bg-surface text-muted hover:border-muted/60 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <Card className="p-5">
          <p className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              <span className="text-muted">Subject:</span>{" "}
              <strong className="font-semibold">{email.subject}</strong>
            </span>
          </p>
        </Card>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList aria-label="Preview format">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="text">Plain text</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "html" ? (
          <Card className="overflow-hidden">
            <iframe
              title={`${email.label} email preview`}
              srcDoc={email.html}
              sandbox=""
              className="h-[560px] w-full border-0 bg-white"
            />
          </Card>
        ) : (
          <Card className="p-5">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
              {email.text}
            </pre>
          </Card>
        )}

        <p className="text-xs text-muted">
          Delivery runs through Resend (or Supabase SMTP) in production. Only transactional mail is
          sent — there is no marketing list.
        </p>
      </div>
    </PageTransition>
  );
}

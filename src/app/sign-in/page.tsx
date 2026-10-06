/*
 * app/sign-in/page.tsx — auth screen (password · magic link · recovery).
 * Why: CHOQUE's gates (protected app routes) lead here. This is a no-database
 * demo build, so authentication is simulated against localStorage — but the UX
 * mirrors the production flows exactly: password sign-in, magic-link request,
 * and password recovery, with real validation (Zod + RHF), loading, error,
 * and success states. A "demo mode" note is shown for transparency.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Crown, Info, KeyRound, Loader2, Mail, MailCheck, ShieldAlert, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { Honeypot, Turnstile, isBot, rateLimit } from "@/components/spam-guard";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";

const passwordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Passwords are at least 8 characters"),
});
const emailSchema = z.object({ email: z.string().email("Enter a valid email address") });

type PasswordForm = z.infer<typeof passwordSchema>;
type EmailForm = z.infer<typeof emailSchema>;

function RedirectNotice() {
  const params = useSearchParams();
  const message = params.get("message");
  if (!message) return null;
  return (
    <p
      role="status"
      className="mb-5 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning"
    >
      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function SignInPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo");
  const { signIn } = useSession();
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [autoEmail, setAutoEmail] = useState<string | null>(null);

  const pw = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const ml = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  /** One-click demo role login: autofills the form AND signs straight in. */
  async function autofillSignIn(email: string) {
    setAutoEmail(email);
    pw.setValue("email", email);
    pw.setValue("password", DEMO_PASSWORD);
    try {
      await signIn(email);
      const account = DEMO_ACCOUNTS.find((a) => a.email === email);
      toast.success(`Signed in as ${account?.label ?? email}`, {
        description: "Everything you do is demo data in this browser.",
      });
      router.push(returnTo || "/gyms");
    } catch {
      setAutoEmail(null);
      toast.error("Couldn't sign you in. Try again.");
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    // Auth rate limit: 5 attempts per minute per browser.
    if (!rateLimit("auth", 5, 60_000)) {
      toast.error("Too many attempts", { description: "Wait a minute before trying again." });
      return;
    }
    try {
      await signIn(data.email);
      toast.success(`Welcome, ${data.email}`);
      router.push(returnTo || "/gyms");
    } catch {
      toast.error("Couldn't sign you in. Try again.");
    }
  }

  async function onMagicLinkSubmit(data: EmailForm) {
    if (!rateLimit("magic", 3, 60_000)) {
      toast.error("Too many requests", { description: "Try again in a minute." });
      return;
    }
    await api.sendMagicLink(data.email);
    setLinkSentTo(data.email);
  }

  async function continueFromMagicLink() {
    if (!linkSentTo) return;
    await signIn(linkSentTo);
    toast.success("Magic link accepted");
    router.push(returnTo || "/gyms");
  }

  async function onRecover() {
    const email = pw.getValues("email");
    const ok = await pw.trigger("email");
    if (!ok) return;
    await api.sendRecovery(email);
    toast.success(`Recovery link sent to ${email}`, {
      description: "In this demo build, use any password to sign in.",
    });
  }

  return (
    <main className="flex min-h-dvh flex-col px-4">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <ThemeToggle />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-20 pt-8"
      >
        <Logo />
        <div className="mt-6"><RedirectNotice /></div>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Welcome to CHOQUE</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in or create an account — the same form does both.
        </p>

        <div className="mt-8 rounded-md border border-border bg-surface p-6 shadow-1">
          {linkSentTo ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <MailCheck className="size-5 text-accent" />
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">Check your inbox</h2>
              <p className="mt-1.5 text-sm text-muted">
                We sent a magic link to <span className="font-medium text-foreground">{linkSentTo}</span>.
              </p>
              <Button className="mt-6 w-full" onClick={continueFromMagicLink}>
                Continue to CHOQUE
              </Button>
              <button
                onClick={() => setLinkSentTo(null)}
                className="mt-3 w-full text-sm text-muted transition-colors hover:text-foreground"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <Tabs defaultValue="password">
              <TabsList className="w-full" aria-label="Sign-in method">
                <TabsTrigger value="password" className="flex-1"><KeyRound className="mr-1.5 size-4" /> Password</TabsTrigger>
                <TabsTrigger value="magic" className="flex-1"><Mail className="mr-1.5 size-4" /> Magic link</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-6">
                <form
                  onSubmit={(e) => {
                    if (isBot(e.currentTarget)) { e.preventDefault(); return; }
                    void pw.handleSubmit(onPasswordSubmit)(e);
                  }}
                  noValidate
                  className="relative space-y-4"
                >
                  <Honeypot />
                  <Field label="Email" error={pw.formState.errors.email?.message}>
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        type="email"
                        autoComplete="email"
                        placeholder="you@dojo.com"
                        aria-describedby={describedBy}
                        {...pw.register("email")}
                      />
                    )}
                  </Field>
                  <Field label="Password" error={pw.formState.errors.password?.message}>
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        aria-describedby={describedBy}
                        {...pw.register("password")}
                      />
                    )}
                  </Field>
                  <Button className="w-full" loading={pw.formState.isSubmitting}>
                    Continue
                  </Button>
                  <Turnstile />
                  <button
                    type="button"
                    onClick={onRecover}
                    className="w-full text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot your password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="magic" className="mt-6">
                <form
                  onSubmit={(e) => {
                    if (isBot(e.currentTarget)) { e.preventDefault(); return; }
                    void ml.handleSubmit(onMagicLinkSubmit)(e);
                  }}
                  noValidate
                  className="relative space-y-4"
                >
                  <Honeypot />
                  <Field label="Email" hint="We'll email you a one-tap sign-in link." error={ml.formState.errors.email?.message}>
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        type="email"
                        autoComplete="email"
                        placeholder="you@dojo.com"
                        aria-describedby={describedBy}
                        {...ml.register("email")}
                      />
                    )}
                  </Field>
                  <Button className="w-full" loading={ml.formState.isSubmitting}>
                    Send magic link
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Demo role accounts: click to autofill + sign in instantly */}
        <div className="mt-6 rounded-md border border-border bg-surface p-4 shadow-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Sparkles className="size-3.5 text-accent" /> Demo role accounts
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon =
                a.email.startsWith("suspended") ? ShieldAlert
                : a.role === "admin" ? Crown
                : a.role === "moderator" ? ShieldCheck
                : UserRound;
              const loading = autoEmail === a.email;
              return (
                <button
                  key={a.email}
                  onClick={() => autofillSignIn(a.email)}
                  disabled={autoEmail !== null}
                  className={cn(
                    "group cursor-pointer rounded-sm border border-border p-2.5 text-left transition-all duration-150 active:scale-[0.98]",
                    "hover:border-accent/50 hover:bg-accent-soft/40 disabled:opacity-60 disabled:cursor-wait",
                    "focus-visible:outline-2 focus-visible:outline-accent",
                  )}
                  aria-label={`Sign in as ${a.label} (${a.email})`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon className={cn("size-4", a.email.startsWith("suspended") ? "text-warning" : "text-accent")} />
                    {a.label}
                    {loading && <Loader2 className="ml-auto size-3.5 animate-spin text-accent" />}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{a.email}</span>
                  <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted/80">{a.blurb}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Password for every demo account:{" "}
            <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px]">{DEMO_PASSWORD}</code>
            {" "}— clicking a card autofills the form and signs you in.
          </p>
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-md border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-accent" />
          Demo build — any email and any 8+ character password work. Everything you
          create is stored privately in this browser, never on a server.
        </p>
      </motion.div>
    </main>
  );
}

/*
 * useSearchParams() requires a Suspense boundary so the route can still be
 * statically prerendered; the fallback mirrors the card layout to avoid CLS.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm text-muted">Loading…</main>}>
      <SignInPageInner />
    </Suspense>
  );
}

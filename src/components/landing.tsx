/*
 * components/landing.tsx — CHOQUE marketing page (all sections).
 * Why: the public face of the product. Renders the hero with real photography
 * from the demo dataset, a discipline marquee, the four product pillars, a
 * live community preview built from the same cards the app uses, onboarding
 * steps, member voices, and the footer. Motion is subtle: small fades and a
 * slow float on the hero chips, all gated by the global reduced-motion rule.
 */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Asterisk,
  Building2,
  CalendarCheck2,
  Flame,
  MapPin,
  NotebookPen,
  Users,
} from "lucide-react";
import { GymCard, MatCard, PartnerCard } from "@/components/cards";
import { Logo, LogoMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers";
import { GYMS, GYM_BY_ID, HERO_IMAGE, OPEN_MATS, PARTNERS } from "@/lib/data";
import { nextWeekdayISO } from "@/lib/utils";
import { EASE_OUT, useMotionEnabled, wordChild, wordContainer } from "@/lib/motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ————————————————— Nav ————————————————— */
function SiteNav() {
  const { session } = useSession();
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="CHOQUE home"><Logo /></Link>
        <div className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#pillars" className="transition-colors hover:text-foreground">Why CHOQUE</a>
          <a href="#community" className="transition-colors hover:text-foreground">Community</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Button onClick={() => (window.location.href = "/gyms")}>
              Open app <ArrowRight className="size-4" />
            </Button>
          ) : (
            <>
              <Link href="/sign-in" className="hidden rounded-sm px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:block">
                Sign in
              </Link>
              <Link href="/sign-in">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

/* ————————————————— Hero ————————————————— */

/** Headline that reveals word-by-word (80ms per word, spec easing). */
function WordReveal({ lines }: { lines: { text: string; accent?: boolean }[][] }) {
  const enabled = useMotionEnabled();
  if (!enabled) {
    return (
      <>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line.map((w, j) => (
              <span key={j} className={w.accent ? "text-accent" : undefined}>{w.text}{" "}</span>
            ))}
          </span>
        ))}
      </>
    );
  }
  return (
    <motion.span variants={wordContainer} initial="hidden" animate="show" className="block">
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-1">
          {line.map((w, j) => (
            <span key={j} className="inline-block overflow-hidden">
              <motion.span
                variants={wordChild}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className={`inline-block ${w.accent ? "text-accent" : ""}`}
              >
                {w.text}
              </motion.span>
              {"\u00A0"}
            </span>
          ))}
        </span>
      ))}
    </motion.span>
  );
}

function Hero() {
  const enabled = useMotionEnabled();
  const imgWrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: imgWrap, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section className="relative overflow-hidden pt-16">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted shadow-1">
              <span className="size-1.5 rounded-full bg-accent" /> A Shoyoroll community
            </p>
          </Reveal>
          <h1 className="mt-6 text-3xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-5xl md:text-6xl">
            <WordReveal
              lines={[
                [{ text: "Find" }, { text: "your" }, { text: "people." }],
                [{ text: "Log" }, { text: "your" }, { text: "rounds." }],
                [{ text: "Keep" }, { text: "clashing.", accent: true }],
              ]}
            />
          </h1>
          <Reveal delay={0.3}>
            <p className="mt-6 max-w-[52ch] text-lg text-muted">
              CHOQUE connects grapplers and strikers with the gyms, training
              partners, and open mats around them — plus a private notebook for
              every detail you catch between rounds.
            </p>
          </Reveal>
          <Reveal delay={0.38}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/sign-in">
                <Button size="lg">
                  Find your gym <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="secondary">Browse open mats</Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.46}>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 text-accent" />
              Live in 10 cities — from LA to Brooklyn.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative">
          <div ref={imgWrap} className="grain relative aspect-[4/3] overflow-hidden rounded-md shadow-2">
            {/* Gentle parallax inside the frame; monochrome treatment lets type carry the color */}
            <motion.div
              style={{ y: enabled ? parallaxY : 0 }}
              className="absolute inset-0 scale-[1.15]"
            >
              <Image
                src={HERO_IMAGE}
                alt="Practitioners training together on the mat"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover grayscale contrast-[1.05]"
              />
            </motion.div>
          </div>
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-3 top-6 rounded-md border border-border bg-surface/95 p-3 shadow-2 backdrop-blur sm:-left-6"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <CalendarCheck2 className="size-3.5 text-accent" /> This Saturday
            </p>
            <p className="mt-1 text-sm font-medium">Open mat · Clash Grappling Co.</p>
            <p className="text-xs text-muted">10:00 — 14 spots left · $15 mat fee</p>
          </motion.div>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute -bottom-5 right-4 rounded-md border border-border bg-surface/95 p-3 shadow-2 backdrop-blur"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <Flame className="size-3.5 text-accent" /> Your notebook
            </p>
            <p className="mt-1 text-sm font-medium">4-week training streak</p>
            <p className="text-xs text-muted">Private — for your eyes only</p>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ————————————————— Marquee ————————————————— */
const MARQUEE = ["Brazilian Jiu-Jitsu", "No-Gi", "Judo", "Wrestling", "MMA", "Muay Thai", "Boxing", "Open Mat", "Drilling", "Randori"];

function Marquee() {
  return (
    <div className="border-y border-border bg-surface py-4" aria-hidden>
      <div className="flex overflow-hidden">
        <div className="animate-marquee flex shrink-0 items-center gap-6 pr-6">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-6 text-sm font-medium uppercase tracking-[0.14em] text-muted">
              {item}
              <Asterisk className="size-4 text-accent" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ————————————————— Count-up stats ————————————————— */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const enabled = useMotionEnabled();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (!enabled) { setVal(to); return; }
    const controls = animate(0, to, {
      duration: 1.1,
      ease: EASE_OUT,
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, enabled, to]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}{suffix}
    </span>
  );
}

function StatBand() {
  const stats = useMemo(
    () => [
      { value: 10, suffix: "", label: "academies" },
      { value: 10, suffix: "", label: "cities live" },
      { value: 14, suffix: "", label: "open mats / two weeks" },
      { value: 30, suffix: "+", label: "members training" },
    ],
    [],
  );
  return (
    <section aria-label="CHOQUE in numbers" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <dd className="text-3xl font-bold tracking-[-0.04em] text-accent sm:text-5xl">
              <CountUp to={s.value} suffix={s.suffix} />
            </dd>
            <dt className="mt-1.5 text-sm text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ————————————————— Pillars ————————————————— */
const PILLARS = [
  {
    icon: Building2,
    title: "Find gyms",
    body: "Every academy worth your mat time — ratings, schedules, drop-in fees, and whether the 6 am crew is friendly. Verified by the community.",
  },
  {
    icon: Users,
    title: "Find partners",
    body: "Filter by discipline, weight class, and availability. Message once, drill forever. Rank rings make skill level readable at a glance.",
  },
  {
    icon: CalendarCheck2,
    title: "Find open mats",
    body: "A two-week horizon of open mats with live capacity. Reserve a spot in one tap and know exactly what the room expects.",
  },
  {
    icon: NotebookPen,
    title: "Keep a notebook",
    body: "Your private training log: techniques, rounds, what worked, what to fix. Local-first and private by default — always.",
  },
];

function Pillars() {
  return (
    <section id="pillars" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Why CHOQUE</p>
        <h2 className="mt-3 max-w-xl text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          One tap from your phone to the mat.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">
          Martial arts runs on word of mouth. CHOQUE gives that network a home —
          calm, fast, and built for the way practitioners actually look for training.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.07}>
            <div className="group h-full rounded-md border border-border bg-surface p-6 shadow-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2">
              <div className="flex size-11 items-center justify-center rounded-sm bg-accent-soft text-accent transition-transform duration-200 group-hover:scale-105">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted measure">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ————————————————— Community preview ————————————————— */
function CommunityPreview() {
  const gyms = [GYMS[0], GYMS[5]];
  const partner = PARTNERS[0];
  const raw = OPEN_MATS[2];
  const mat = {
    ...raw,
    gym: GYM_BY_ID.get(raw.gymId)!,
    date: nextWeekdayISO(raw.weekday, raw.weekOffset),
    attendees: raw.attendeesBase,
    rsvped: false,
    full: false,
  };
  return (
    <section id="community" className="border-y border-border bg-surface/60 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">The community</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
              This week on CHOQUE
            </h2>
          </div>
          <Link href="/sign-in">
            <Button variant="secondary">Explore everything <ArrowRight className="size-4" /></Button>
          </Link>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {gyms.map((g, i) => (
            <Reveal key={g.id} delay={i * 0.08}><GymCard gym={g} /></Reveal>
          ))}
          <Reveal delay={0.16}><PartnerCard partner={partner} /></Reveal>
          <Reveal delay={0.24}><MatCard mat={mat} /></Reveal>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— How it works ————————————————— */
const STEPS = [
  { n: "01", title: "Create your profile", body: "Tell the community your disciplines, rank, home academy, and when you train. Two minutes, no fluff." },
  { n: "02", title: "Discover what's near", body: "Gyms with real schedules, partners at your weight, and open mats with live capacity — filtered your way." },
  { n: "03", title: "Log every session", body: "After the last round, spend ninety seconds in your private notebook. Watch the streaks and insights build." },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">How it works</p>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">From sign-up to sweat in a day</h2>
      </Reveal>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <p className="text-3xl font-bold tracking-[-0.03em] text-accent/25">{s.n}</p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted measure">{s.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ————————————————— Voices ————————————————— */
const VOICES = [
  {
    quote: "I moved to a new city on a Monday and was drilling with two purple belts by Saturday. That's the whole review, honestly.",
    name: "Dani K.",
    detail: "BJJ purple belt · Portland",
  },
  {
    quote: "The notebook changed how I train. Writing down one thing that worked and one thing to fix turned random rolling into an actual plan.",
    name: "Yuki T.",
    detail: "Judo nidan · Seattle",
  },
  {
    quote: "Open mats used to mean ten group chats. Now I check CHOQUE on the train and my Saturday is set before I get home.",
    name: "Leo G.",
    detail: "Muay Thai · Miami",
  },
];

function Voices() {
  return (
    <section className="border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">From the mat</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {VOICES.map((v, i) => (
            <Reveal key={v.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-md border border-border bg-surface p-6 shadow-1">
                <blockquote className="text-sm leading-relaxed text-foreground measure">
                  “{v.quote}”
                </blockquote>
                <figcaption className="mt-5 pt-4 text-sm border-t border-border">
                  <span className="font-semibold">{v.name}</span>
                  <span className="block text-xs text-muted">{v.detail}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————— CTA band ————————————————— */
function CtaBand() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-6xl overflow-hidden rounded-lg bg-stone-900 px-6 py-16 text-center text-stone-50 shadow-2 sm:px-12 dark:bg-surface dark:border dark:border-border relative">
        <div className="grain absolute inset-0" aria-hidden />
        <h2 className="relative text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          Your mat family is already training.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-stone-400 dark:text-muted">
          Join CHOQUE free — find your gym, line up your week, and start the notebook your future black belt will thank you for.
        </p>
        <div className="relative mt-8">
          <Link href="/sign-in">
            <Button size="lg">Create free account <ArrowRight className="size-4" /></Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ————————————————— Footer ————————————————— */
function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            A community platform by Shoyoroll for the people who show up early
            and stay for the last round.
          </p>
        </div>
        {[
          { h: "Product", items: ["Find gyms", "Find partners", "Open mats", "Notebook"] },
          { h: "Community", items: ["Shoyoroll", "Affiliate academies", "Events"] },
          { h: "Legal", items: ["Privacy", "Terms", "Community Guidelines"] },
        ].map((col) => (
          <nav key={col.h} aria-label={col.h}>
            <p className="text-sm font-semibold">{col.h}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {col.items.map((item) => {
                const legal: Record<string, string> = {
                  Privacy: "/legal/privacy",
                  Terms: "/legal/terms",
                  "Community Guidelines": "/legal/guidelines",
                };
                return (
                  <li key={item}>
                    <Link href={legal[item] ?? "/sign-in"} className="transition-colors hover:text-foreground">
                      {item}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border py-6">
        <p className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 text-xs text-muted sm:px-6">
          <span>© {new Date().getFullYear()} CHOQUE, a Shoyoroll community</span>
          <span className="flex items-center gap-1.5"><LogoMark className="size-4" /> Demo build — your data lives in this browser only</span>
        </p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <main>
      <SiteNav />
      <Hero />
      <Marquee />
      <StatBand />
      <Pillars />
      <CommunityPreview />
      <HowItWorks />
      <Voices />
      <CtaBand />
      <SiteFooter />
    </main>
  );
}

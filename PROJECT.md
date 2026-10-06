# CHOQUE — Project Plan & Decision Record

Plain-English record of what was built, why, in what order, and what it costs to run.

---

## 1. Vision

A calm community platform for martial-arts practitioners: **find a gym, a partner, an open mat; keep a private notebook.** Shoyoroll's audience is global (BJJ is Brazilian in origin, practiced everywhere), privacy-conscious (notebook = secrets), and safety-sensitive (meeting strangers to fight each other requires trust deliberately engineered into the platform).

## 2. Phases & scope

| Phase | Tier | Scope | Status |
|---|---|---|---|
| **1 — Directory** | $3,000 | Design system, layout, tab bar, landing, roles + RLS foundation, migrations (profiles/styles/gyms/open mats), seed, gym search + filters + Leaflet map, gym profile + JSON-LD, admin gym CRUD + review, auth for admin, analytics basics, mobile polish, SEO | ✅ shipped |
| **2 — Community** | $5,000 | Public auth + onboarding, profile privacy, partner search, mutual connections + contact-on-accept, open-mat browse/submit/moderation, notebook (markdown + collections + YouTube), report/block, rate limiting, recovery, suspension flow, user/role management, audit log, full matrix RLS suite, e2e smoke tests | ✅ shipped |
| **3 — Polish & extras** | — | Section 6 extras (travel mode, ⌘K, streak heatmap, note templates, visitor badge, waitlist, reminders, OG cards, guidelines ack), performance + a11y passes, docs, handoff | ✅ shipped |

Every phase ended with: builds green (`next build`, `tsc`, `lint`), tests green, and a working preview.

## 3. What's in the demo (no database)

The running product is deliberately **database-free**: a curated demo dataset (`src/lib/data.ts`, 10 gyms / 12 partners / 14 mats with real Pexels photography) plus user state in localStorage with a `choque:v1:` namespace. The whole app talks through `src/lib/api.ts` — an async facade with the exact method surface a real Supabase client would expose, so swapping data sources touches one file, zero pages.

The SQL layer in `/supabase` is production-ready independently of the UI: apply `migrations/` 00001→00008 order, run `seed.sql`, optionally `seed_dev_users.sql` (dev-only, clearly flagged), then prove the security with `rls-test.sql`.

## 4. Access control summary (section 4A)

Five roles: visitor, member, gym owner, moderator, admin — plus `is_suspended` as a **status flag, not a role**.

Enforcement layers, deepest to shallowest:
1. **Postgres RLS policies** — one per table per operation, default deny, plain-English `COMMENT ON POLICY` per rule.
2. **Guards in triggers** — role escalation, last-admin protection, connection state machine, daily connection cap.
3. **Server helpers** — `requireRole()` / `requireActiveMember()` at the top of every admin route/action; middleware as an early redirect courtesy.
4. **Client capability resolver** (`lib/permissions.ts` + `<Can>` + `useRole()`) — hides controls; **never the security mechanism**.

Invariants enforced everywhere: nobody (not even admins) reads another's notebook; blocked pairs see nothing of each other; only admins change roles or unsuspend; the last admin is indestructible; suspended users are read-only.

## 5. Data flow

```
UI (client)                  Server / guard               Storage
───────────────────────────────────────────────────────────────────────
Button click → lib/api.ts fn → cap check (demo)          → localStorage
                                 (in prod: RLS policy)     (in prod: Postgres)
Review/submit → lib/api.ts    → audit event + reason      → events table
Analytics    → track()        → DNT check first           → events table (no cookies)
```

Every mutation logs an `audit.*` event; moderation actions require a mandatory reason stored with the entry.

## 6. Operating costs

| Stage | Cost / month | What's on |
|---|---|---|
| **Launch** | ~$0–25 | Vercel Hobby (free) + Supabase Free + Resend Free (100 emails/day) — covers a small city launch comfortably |
| **Growing** | ~$50–100 | Supabase Pro ($25) once you pass 8 GB or need backups; Vercel Pro ($20) for analytics + speed; Resend Pro ($20) when transaction volume passes the free tier |

**Triggers to upgrade:**
- Vercel Hobby → Pro: you need >1 concurrent deployment, team access, or higher build minutes.
- Supabase Free → Pro: weekly organic signups consistently >500, or you need point-in-time recovery.
- Resend free → paid: daily transactional email >100/day (signups + connection emails track user growth linearly).

Everything deploys under the **client's own Vercel and Supabase accounts**; no vendor lock to any agent account.

## 7. Decisions worth knowing

1. **No in-app chat in v1.** Connection requests exchange contact details only after mutual acceptance — chat surfaces are spam magnets; this keeps the trust surface small.
2. **Notebook is owner-only with no admin override.** Privacy as a hard architectural guarantee, not a policy promise (the RLS test suite asserts it).
3. **Moderation actions always need a reason, logged with hashed IP.** Moderation disputes are the hardest part of community ops; an immutable reason log solves them.
4. **Do Not Track is honoured at the source.** A DNT browser never even queues events — simpler than post-hoc filtering.
5. **Local-first notebook demo.** Phase 3's "offline tolerant, queue writes" pattern makes it naturally resilient; in production these queues flush to Supabase.

## 8. Handoff

- **Repositories & infrastructure belong to the client.** All code ships in the client's GitHub org; Vercel, Supabase, Resend are opened under the client's accounts.
- **Ownership statement:** the client owns all work product in this repository outright — code, designs, copy and documentation.
- **Walkthrough:** `docs/ADMIN_GUIDE.md` is the written admin walkthrough; demo accounts on the sign-in screen are the living demo.
- **Environment**: every required variable is documented in `.env.example`.

## 9. What's next (post-handoff)

1. Real Supabase wiring (swap `lib/api.ts` impl, keep queries identical).
2. Resend delivery for the seven email templates + reminder cron (Supabase Edge Function on the open_mats table).
3. PWA install prompts and push (after email proves reliability).
4. Live city expansion based on zero-result search table in admin analytics.

# CHOQUE

**Find your people. Log your rounds. Keep clashing.**

CHOQUE is a community platform from Shoyoroll for martial-arts practitioners (BJJ, judo, wrestling, MMA, striking) to find gyms, find training partners, find open mats, and keep a private training notebook. Quality bar: the care and simplicity of an Apple product — clean, calm, fast, accessible, mobile-first.

---

## Quick start (demo mode, no database required)

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with **any email + any 8-character password** — or click one of the five
one-click demo accounts on the sign-in screen:

| Account | Email | What it demonstrates |
|---|---|---|
| Member | `member@choque.dev` | Directory browsing, partner requests, submissions, private notebook |
| Gym owner | `owner@choque.dev` | Member powers + editing a claimed gym listing |
| Moderator | `moderator@choque.dev` | Review queue, reports, gym claims, suspend members |
| Admin | `admin@choque.dev` | Everything — users, roles, unsuspend, audit log, full analytics |
| Suspended member | `suspended@choque.dev` | Reads fine; every write is refused with clear errors |

All demo passwords are **`choque-demo`**. Everything you do is stored in your
browser's localStorage — nothing leaves your machine.

## Scripts

```bash
npm run dev          # Develop
npm run build        # Production build (must pass)
npx tsc --noEmit     # Strict typecheck (must pass)
npm test             # Vitest — access-matrix suite (17 tests)
npm run test:e2e     # Playwright — redirects, hidden controls, journeys
npx next typegen     # Regenerate route types
```

## Stack

- **Next.js 16 (App Router) + TypeScript strict**, Tailwind v4 + Radix UI
- **Framer Motion** (`src/lib/motion.ts` is the single animation source)
- **TanStack Query + Zod + React Hook Form**
- **Supabase-ready**: Postgres schema + RLS migrations under `/supabase`
- **Vercel Analytics + first-party event log** (no third-party trackers, DNT-respecting)
- **Vitest + Playwright** for unit/e2e validation

## Project layout

```
/app
  (marketing)      hero landing page
  (app)/           gyms, gyms/[slug], open-mats, partners, notebook,
                   requests, profile, onboarding, travel, welcome
  (auth)/          sign-in (password + magic link + recovery) with role cards
  admin/           dashboard, queue, reports, users, analytics, claims,
                   gyms, emails, audit
  api/             health check, admin users, og image generator
  legal/           terms, privacy, community guidelines
/components/ui, cards, filters, markdown, youtube, waitlist, pwa…
/lib               demo data, api facade, storage, permissions, auth-guard,
                   motion, i18n, emails, search canvas
/supabase          migrations (00001–00008), seed.sql, seed_dev_users.sql, RLS.md, rls-test.sql
/docs              SETUP, DEPLOYMENT, MAINTENANCE, ADMIN_GUIDE, ARCHITECTURE
/tests             unit/access-matrix, e2e/access
```

## Docs

| File | What it covers |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | One-time project + Supabase + email configuration |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Vercel, go-live checklist, costs & upgrade triggers |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | Weekly operations, additions, backups, incidents |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Non-developer admin manual (queues, shortcuts, suspensions) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, security model, schema, extension points |
| [PROJECT.md](PROJECT.md) | Project plan, phases, decisions, handoff |

---

*Demo build: all community content is curated dummy data; user actions persist in localStorage. The SQL layer in `/supabase` is production-ready and ready to swap in when you swap `lib/api.ts` for real Supabase calls.*

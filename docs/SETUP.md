# CHOQUE — Setup Guide

One-time configuration: repo, database, email. Everything is **yours** — your GitHub org, your Vercel account, your Supabase project, your Resend account.

---

## 1. Prerequisites

- **Node.js 20 or newer** (`node -v`)
- A **GitHub org** the client controls
- A **Vercel account** (free Hobby plan is enough to start)
- A **Supabase account** (free plan covers launch)

## 2. Clone + install

```bash
git clone <your-org>/choque.git
cd choque
npm install
cp .env.example .env.local
```

The app boots instantly with zero environment variables — it runs in demo mode, data stored in your browser. That's the fastest way to review everything.

```bash
npm run dev
# open http://localhost:3000
```

## 3. Supabase (production database)

1. **Create a project** — Supabase → New Project → region near your community. Save the database password.
2. **Apply migrations** in order:

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/00001_foundations.sql
   psql "$DATABASE_URL" -f supabase/migrations/00002_gyms_open_mats.sql
   psql "$DATABASE_URL" -f supabase/migrations/00003_notes.sql
   psql "$DATABASE_URL" -f supabase/migrations/00004_connections_blocks.sql
   psql "$DATABASE_URL" -f supabase/migrations/00005_reports_events_audit.sql
   psql "$DATABASE_URL" -f supabase/migrations/00006_rpc.sql
   psql "$DATABASE_URL" -f supabase/migrations/00007_access_matrix.sql
   psql "$DATABASE_URL" -f supabase/migrations/00008_ownership_policies.sql
   ```

3. **Seed the launch directory** (15 gyms, 10 open mats, 8 styles):

   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

4. **(Dev environments only)** `@choque.dev` demo accounts for every role:

   ```bash
   psql "$DATABASE_URL" -f supabase/seed_dev_users.sql
   ```

5. **Fill `.env.local`** with the two URL/key pairs from Project Settings → API:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` into the client,
   `SUPABASE_SERVICE_ROLE_KEY` only into **server-only** environments.

6. **Prove the permissions** — run the RLS suite against the seeded project:

   ```bash
   psql "$DATABASE_URL" -f supabase/rls-test.sql
   # Expected output: every check prints PASS.
   ```

## 4. Email (transactional)

1. Sign up at **resend.com** and verify your sending domain.
2. Set in `.env.local` and in Vercel env vars:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM="CHOQUE <hello@yourdomain.com>"
   ```
3. Send a test by visiting **/admin/emails** — the HTML/Plain-text previews are the exact output the sender uses.

The seven templates live in `src/lib/emails.ts`: welcome, verify, reset, request received, request accepted, listing approved, listing rejected + the open-mat day-before reminder.

## 5. Spam protection (optional but recommended)

CHOQUE already has a honeypot and client rate limiting on public forms. To add Cloudflare Turnstile:

1. Create a free Turnstile sitekey at cloudflare.com/turnstile.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client) and `TURNSTILE_SECRET_KEY` (server) — the sign-in form upgrades automatically.

## 6. Swap the demo data layer for Supabase (when ready)

Only **one file needs replacement**: `src/lib/api.ts`. Its function surface mirrors what every screen calls (`listGyms`, `getPartner`, `listOpenMats`, `createEntry`, `respondToConnection`…). Re-implement each function as a Supabase query inside a server action or route handler; the UI never changes.

## 7. Verify everything

```bash
npm run build      # production build
npx tsc --noEmit   # strict typecheck
npm test           # 17-test access-matrix suite
npm run test:e2e   # Playwright redirect/journey tests
```

All four must finish green before you deploy.

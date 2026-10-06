# CHOQUE — Deployment Guide

Production deployment is a **5-minute Vercel + Supabase pairing** you fully own.

---

## 1. Deploy to Vercel

```bash
# One-off: link the repo to a Vercel project (client's Vercel account)
npx vercel link
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard — every push to `main` then auto-deploys, and pull requests get preview URLs.

## 2. Environment variables

In **Vercel → Project → Settings → Environment Variables**, add every value from `.env.example` for Production and Preview environments. The server-only secret (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`) must stay **Server only** in Vercel — never prefixed with `NEXT_PUBLIC_`.

```bash
# One-liner once secrets are set locally
vercel env pull .env.production
```

## 3. Database & domain

1. Supabase → your production project → **Project Settings → Database → Connection string** → use in `DATABASE_URL` migrations as needed.
2. Point your custom domain at Vercel: Vercel → Project → Settings → Domains → `choque.yourdomain.com`, then add the CNAME it prints.

## 4. Go-live checklist

- [ ] `npm run build`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e` all pass locally
- [ ] Migrations 00001–00008 applied to the production project
- [ ] `seed.sql` run once (or the strip block in `seed.sql` after your real directory replaces the demo rows)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the final domain (drives sitemap and OG tags)
- [ ] Resend domain verified, `RESEND_API_KEY` set
- [ ] `seed_dev_users.sql` **stripped** (its block at the bottom removes everything)
- [ ] First two admin accounts created via Supabase Auth invitations and `profiles.role = 'admin'` set by SQL
- [ ] `/admin` reachable, every queue empty, audit log recording
- [ ] Mobile-tested at 360px, 768px, 1280px; Lighthouse mobile ≥ 90

## 5. Costs & upgrade triggers (repeated from PROJECT.md)

| Stage | Cost / month | Components |
|---|---|---|
| **Launch** | ~$0–25 | Vercel Hobby + Supabase Free + Resend Free (100 emails/day) |
| **Growing** | ~$50–100 | Supabase Pro ($25), Vercel Pro ($20), Resend Pro ($20) |

Upgrade triggers:
- **Vercel Hobby → Pro** when build minutes run out, or you need team seats and analytics.
- **Supabase Free → Pro** when you approach the 8 GB cap or need point-in-time recovery.
- **Resend Free → Pro** when daily transactional email >100/day.

None of this binds you to any outside account — all services are under the client's own logins.

## 6. Rollback

- **Code**: `git revert <sha>` then push, or click **Redeploy** on the previous Vercel deployment.
- **Database**: Supabase Pro's point-in-time recovery, or restore from nightly `pg_dump` (see MAINTENANCE.md for the backup job).

## 7. What not to do

- Don't put `SUPABASE_SERVICE_ROLE_KEY` in the browser bundle. Any variable needing it must be consumed only in route handlers (under `/app/api`) and must check `requireRole()` first.
- Don't edit the production project with the SQL editor without a migration file — every change belongs in `supabase/migrations/NNN_name.sql` with a comment explaining why, so staging and production stay identical.

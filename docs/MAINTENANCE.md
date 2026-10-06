# CHOQUE — Maintenance Guide

Small recurring tasks that keep the platform healthy. Most of this runs itself.

---

## 1. Weekly (10 minutes)

- Review the dashboard queues (see ADMIN_GUIDE.md §10)
- Look at zero-result searches in Analytics → shortlist new cities for expansion
- Skim the audit log for any unusual pattern (repeated suspend-unsuspend cycles, bulk role edits)

## 2. Adding content (gyms, open mats)

Two sources:
1. **Member submissions** — land in the review queue automatically.
2. **Direct edit** — staff with admin access can edit any gym or open mat from `/admin/gyms`. Prefer this route for corrections to verified listings; member suggestions go through the queue so two people's eyes always land on changes.

Coaching newcomers: the **Visitor-friendly** badge is earned when the listing has an explicit drop-in policy, set by an admin on the gym's edit screen.

## 3. Backups (production)

Supabase Free does not include point-in-time recovery. Add a nightly dump on any host (Vercel cron job, GitHub Action, or a tiny VPS):

```bash
pg_dump "$DATABASE_URL" --no-owner --format=plain \
  | gzip > "backups/choque-$(date +%F).sql.gz"
```

Keep at least the last 14 days off-site. When you upgrade to Supabase Pro, PITR replaces this.

## 4. Dependencies

- **Next.js / React**: stay within one major version of current; run `npm outdated` monthly.
- **Node runtime**: bump base image to the active LTS every six months.
- Run `npm audit` periodically. This repo never pins a day's security post — patch via `npm install <pkg>@latest`.

## 5. Incidents — quick answers

| Symptom | First thing to check |
|---|---|
| People can't sign in | Supabase Auth health; email provider quota; rate limiter logs in the events table |
| Emails not arriving | Resend dashboard → Rejects/Suppression list; verify DKIM/SPF on the domain |
| Elevated errors on `/admin` | Suspension-loop bug: a member has suspended an admin. Read the audit log first. |
| Sudden traffic spike | Vercel Analytics suggests edition by a major magazine/site; consider temporarily raising the connection daily limit only if your moderators confirm regression. Otherwise leave it — 10/day is what makes requests credible. |
| Users report their notes vanished | RLS rule intact (`notes owner only`) → check a browser-profile localStorage wipe / logout-clearing if still on demo mode. Production notes are never deleted unless the owner does it (or a storage outage). |

## 6. Monitoring without third-party trackers

Use the in-app `events` table + `/admin/analytics`. It covers what you need for launch-year ops: volume, retention signal (weekly active sessions), directory demand, and the moderation workload. Don't add an external tracker; it's the one privacy promise the product makes loudly.

## 7. When to replace the demo data layer

`src/lib/api.ts` is the whole seam. When you're ready for production:

```bash
# Example: replace the stub with real Supabase calls, one function at a time
# (its signature never changes, so every page keeps working)
pnpm install @supabase/supabase-js @supabase/ssr
```

Keep the demo dataset as backdrop by leaving `src/lib/data.ts` as the fallback the SQL layer populates from `seed.sql`.

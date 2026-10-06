# CHOQUE — Architecture

The whole system in one picture, then the important seams.

---

## 1. Runtime shape

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Next.js client)                                          │
│  • Server components for initial load                             │
│  • TanStack Query for all async state + caching                   │
│  • framer-motion, dnd-kit, vaul, Recharts                         │
│  • localStorage ("demo mode": all user data + content)            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│ Next.js server (Vercel)                                          │
│  • Server components (SSR landing, gym pages, admin)              │
│  • Route handlers: /api/health, /api/admin/*, /api/og/[kind]      │
│  • middleware.ts — edge gate for /(app) and /admin                │
│  • lib/auth-guard.ts — requireRole / requireActiveMember           │
└───────────┬──────────────────────────────┬───────────────────────┘
            │                              │
┌───────────▼────────────┐     ┌──────────▼───────────────┐
│ Supabase Postgres      │     │ Resend                   │
│ (RLS on every table)   │     │ (7 transactional         │
│  profiles              │     │  templates)              │
│  styles                │     └──────────────────────────┘
│  gyms / gym_styles     │
│  open_mats             │
│  connections / blocks  │
│  notes / collections / │
│   note_links           │
│  reports               │
│  gym_claims / gym_owners
│  events (analytics)    │
│  audit_log             │
└────────────────────────┘
```

In demo mode, the storage column is `localStorage`; in production it's Supabase.

## 2. The seam: `src/lib/api.ts`

```ts
export async function listGyms(filters)       // demo: filter the dataset
export async function getPartner(slug)        //        or query profiles
export async function createEntry(input)      // demo: prepend to localStorage
export async function reviewSubmission(id)    //        or update with RLS
```

Every page calls these methods; no page ever touches a database driver. When you swap the demo for Supabase, only this file's bodies change.

## 3. Security model (four layers, deepest wins)

1. **Postgres RLS** — explicit `POLICY per TABLE per OPERATION`, default deny, each policy carrying a plain-English comment. (`supabase/RLS.md` is the audit record.)
2. **Database triggers** — role escalation guard, connection state machine, daily limit, last-admin protection, moderator write audit.
3. **Server guards** — `requireRole([...])` as the first line of every admin route; middleware redirect as a convenience.
4. **UI gating** — `useRole()` + `<Can>` hide, disable, and annotate; never serve as security.

Acceptance tests live in `tests/unit/access-matrix.test.ts` (17 tests) and `supabase/rls-test.sql`; both are required to pass before a deploy.

## 4. Key tables

| Table | Shape | RLS rule of note |
|---|---|---|
| `profiles` | one per auth user, role + `is_suspended` flag + per-field `visibility` jsonb + `credentials` jsonb | Staff see everything; members see rows subject to visibility and block pairs |
| `gyms` / `open_mats` | `status: draft\|pending\|published\|rejected` + `submitted_by` + tsvector `search` | Everyone reads published; draft/pending hidden from the public and searchable by staff and submitter only |
| `connections` | mutual-accept pair + message + status enum | Read = participants only; accepted = unlocks contact fields via `get_profile()` |
| `notes` + `collections` + `note_links` | user-owned everything | **Owner only — deliberately no staff read policy.** |
| `reports` | target + reason + status + handled_by | Insert: any member; read/update: staff only |
| `gym_claims` / `gym_owners` | claim → staff review → granted owner | Claims visible to claimant + staff |
| `audit_log` | actor, action, entity, diff, reason, IP hash | Append-only, staff-read (admin-full), trigger-driven |
| `events` | first-party analytics | Insert; staff read |

## 5. Search design

The gym search is deliberately simple and typo-tolerant: a maintained `tsvector` column on `gyms` with GIN index + a trigram index on `name`/`neighborhood`. `search_gyms(query, city, neighborhood, styles[], limit, offset)` returns ranked rows with hydrated style chips — the directory filters and the admin analytics' zero-result table feed off the same function.

## 6. Analytics design

First-party only. `track(name, props)` writes a local event (or in production, inserts a row into `events`) — unless the browser sends **Do Not Track**, in which case it writes nothing at all. No cookies. The admin analytics charts read from the same events the activity log shows, so nothing is "tracked secretly".

## 7. Extension points

- **More roles**: add to the `app_role` enum, `lib/permissions.ts`, the admin nav filter.
- **New note kinds**: extend the `SessionType` enum and `TYPE_META` in the notebook page.
- **More cities**: `seed.sql` `NEIGHBORHOODS` + `GYMS`; never edit `data.ts` for content changes (edit the SQL).
- **Real-time**: subscribe to the `open_mats` table and re-emit rsvp counts when you want live capacity badges.

## 8. Ownership

All code, designs, and documentation belong to the client. Every service account (Vercel, Supabase, Resend, domain) is opened under the client's own credentials. This repository ships complete; nothing here depends on the builder's infrastructure to keep running.

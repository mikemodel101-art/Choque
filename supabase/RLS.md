# CHOQUE — RLS matrix & test guide

Why: section 4A of the spec requires a full, testable permission matrix. Each
row below names a table, an action, a role, the result, and the SQL that
proves it. Run the smoke tests on a seeded Supabase project with `psql
"$DATABASE_URL" -f supabase/rls-test.sql` after `seed.sql`.

## Roles

| Role       | Where it lives                        | Granted by |
|------------|---------------------------------------|------------|
| visitor    | anon JWT (no `auth.uid()`)            | — |
| member     | `profiles.role = 'user'`, email verified | sign-up + verification |
| gym owner  | member + approved claim (Phase 3)     | admin approves claim |
| moderator  | `profiles.role = 'moderator'`         | an admin |
| admin      | `profiles.role = 'admin'`             | first row seeded manually; others promoted by admins |

## Suspension (status flag, not a role)

`profiles.is_suspended` (+ `suspended_at`, `suspended_by`). A suspended user
**can sign in and browse** but cannot post, submit listings, report, or
request connections (write policies all carry `not public.is_suspended()`),
and disappears from partner search and `get_profile()` for non-staff.

| Action        | Who |
|---------------|-----|
| suspend       | moderators (members only) · admins (anyone, incl. staff) |
| unsuspend     | **admins only** |
| last admin    | cannot be suspended, demoted, or deleted — enforced by triggers |

## Feature matrix (v2)

Legend: Y = allowed · N = not allowed · L = limited (see notes)

| Feature | Visitor | Member | Gym Owner | Moderator | Admin |
|---|---|---|---|---|---|
| Browse/search published gyms, gym profile | Y | Y | Y | Y | Y |
| Browse published open mats | Y | Y | Y | Y | Y |
| Submit an open mat | L (email-verified only) | Y | Y | Y | Y |
| Suggest a gym edit / new gym | N | Y | Y | Y | Y |
| Edit own claimed gym | N | N | Y | Y | Y |
| Create/edit own profile | N | Y | Y | Y | Y |
| Search training partners | N | Y | Y | Y | Y |
| View other profiles | N | L (fields shared with them) | L | L | L |
| Send connection request | N | Y (10 / 24h limit) | Y | Y | Y |
| Accept/decline requests | N | Y | Y | Y | Y |
| Block or report user/listing | N | Y | Y | Y | Y |
| Own private notebook | N | Y | Y | Y | Y |
| Read someone else's notes | N | N | N | N | N |
| Approve/reject gyms & open mats | N | N | N | Y | Y |
| Add/edit any gym | N | N | N | Y | Y |
| Handle reports queue | N | N | N | Y | Y |
| Suspend users | N | N | N | Y | Y |
| Unsuspend users | N | N | N | N | Y |
| Analytics dashboard | N | N | N | L (summary only) | Y |
| Change user roles | N | N | N | N | Y |
| View audit log | N | N | N | N | Y |
| Delete a user account | N | L (own only) | L (own only) | N | Y |

### Notes that back the matrix

- **Other profiles** — each field honors its owner's public / connections /
  private setting via `get_profile()`. Exact location is never shown; only
  city or neighborhood.
- **Contact details** (host contact, phone) are only exchanged after both
  sides accept a connection — enforced app-side in Phase 3; profiles hold no
  raw contact columns by design.
- **Moderators** can suspend but never delete accounts, and read analytics
  only as aggregates (`events` table select; app serves them summary RPCs).
- **Everything above is re-checked in SQL** — a mischievous client can hide
  nothing and do nothing the matrix forbids; UI gating is courtesy only.

Role changes go through the `profiles_guard_role_credentials` trigger:
**only an admin can change `role`; only moderators can change `credentials`.**
No client can self-promote, and moderators cannot mint new moderators.

## Matrix

| Table | Action | visitor | member | mod | admin |
|---|---|---|---|---|---|
| styles | select all | ✅ | ✅ | ✅ | ✅ |
| profiles | select own / connected / non-private* | own | own + others** | all | all |
| profiles | insert | — | own id | — | — |
| profiles | update | — | own (not role / credentials) | all cols except role+credentials(they can set credentials) | all |
| gyms | select | published only | + own submissions | all | all |
| gyms | insert | — | ✅ (auto-pending) | ✅ | ✅ |
| gyms | update | — | own (not status) | all | all |
| gyms | delete | — | — | ✅ | ✅ |
| open_mats | same shape as gyms | published only | + own | all | all |
| gym_styles | select / write | published only | with own gym | all | all |
| notes / collections / note_collections / note_links | all | — | **own only — no admin read, ever** | — | — |
| connections | select | — | participants only | audit | audit |
| connections | insert | — | sender=self, no block pair | — | — |
| connections | update | — | requester: cancel; recipient: accept/decline (trigger-enforced state machine) | — | — |
| blocks | insert/select/delete | — | blocker only | — | — |
| reports | insert | — | reporter=self | — | — |
| reports | select | — | own submissions | full queue | full queue |
| reports | update | — | — | ✅ (auto-stamps handler) | ✅ |
| events | insert | — | self or null user | — | — |
| events | select | — | — | ✅ | ✅ |
| audit_log | select | — | — | ✅ | ✅ |
| audit_log | insert/update/delete | — | — | server triggers only | server triggers only |

\* `get_profile()` masks per-field via the `visibility` jsonb map ('public' |
'connections' | 'private'). Block pairs are invisible to one another and
cannot request connections (insert policy + get_profile return null).

\** Connected members see fields marked 'connections' — and nothing marked
'private' — through `get_profile()`.

## Postman-style SQL smoke tests

Save as `supabase/rls-test.sql` and run with the project's psql URL:
`psql "$DATABASE_URL" -f supabase/rls-test.sql`

It uses `role=authenticated` + `request.jwt.claims` to impersonate seeded
users and prints PASS/FAIL lines for the whole matrix (sign-up two throwaway
accounts first and pace their `auth.users.id` UUIDs into the variables at
the top).

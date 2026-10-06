# CHOQUE — Admin & Moderator Guide

Written for the people who will look after the platform, not for engineers. Every screen shows you the same rules the database enforces.

---

## 1. Where things live

- **`/admin`** — your home base (`choque.app/admin`)
- Open it by signing in as a **Moderator** or an **Admin** and tapping the shield icon in the top bar.
- **Moderators** see: Dashboard, Review queue, Reports, Gyms, Gym claims, Emails.
- **Admins** additionally see: **Users**, **Analytics**, and the **Audit log**.

If you ever reach one of these pages by accident, you land on a friendly "staff only" message — nothing destructive happens.

## 2. The dashboard

`/admin` answers three questions at a glance:

| Tile | What it tells you |
|---|---|
| Pending gyms | Members' gym suggestions waiting for review |
| Pending open mats | Open-mat submissions awaiting approval |
| Open reports | Member reports that haven't been actioned |
| Sign-ins this week | Rough traffic signal for the week |

Click any tile to jump straight to that queue.

## 3. Reviewing listings fast (Review queue)

On **Review queue** you'll see each pending submission with its title, submitter, and content.

- **Approve** — the listing becomes published and visible to everyone.
- **Reject** — it stays hidden; the submitter gets an email explaining it didn't fit the guidelines (use the edit-and-resubmit guidance in the email).

**Fast mode:** keep `j`/`k` to move through items, press **`a`** to dismiss as fine, **`r`** to open the action menu. You never have to touch the mouse.

## 4. Reports

Reports arrive from the **Report** button on every gym, open mat, and profile. Each row shows:

- The **target** (with its history of prior reports)
- The **reason** the reporter chose + their free-text details
- Previous reports on the same account (helps spot patterns)

Your four outcomes — every one of them **requires a written reason** that lands in the audit log:

| Button | What it does |
|---|---|
| **Dismiss** | Nothing wrong; closes with a polite result |
| **Hide listing** | Pull the gym/mat from the public directory (reversible) |
| **Warn user** | A compliance reminder is logged/sent to the account |
| **Suspend user** | The account immediately becomes read-only (moderators may only suspend members; only admins can suspend staff or unsuspend anyone) |

## 5. Gym claims

When a member requests to run a gym's listing, it appears in **Gym claims**. **Approve** grants them the Gym Owner role and the right to edit that listing; the approved ownership is recorded in `gym_owners` with who approved it and when. **Reject** with a reason — typical cases: they don't work there, or you need one piece of proof.

## 6. Users (admins only)

Search by name, email, or role. Every row shows role badges, suspension state, and whether the account is **the last admin** — which nobody can touch (including themselves).

Actions:
- **Change role** — promote or demote. Required reason. Every change is in the audit log.
- **Suspend** — read-only mode. Only admins can unsuspend.
- **Unsuspend** — restores full access. Also admin-only.

**The last admin is untouchable:** demotion, suspension and deletion fail in the UI and in the database. Always promote a replacement first.

## 7. Analytics (admins only)

Four charts answer "are we growing and where are people stuck?"

- **Signups per week** — eight-week trend
- **Top searched cities** — demand heatmap (best input for what to launch next)
- **Zero-result searches** — *the* leading indicator for expansion: where people searched and found nothing
- **Most viewed gyms** — directory health

## 8. Audit log (admins only)

Append-only record of every privileged action: the actor, the action, the target, the mandatory reason, the timestamp, and a one-way hash of the IP. When a member appeals a suspension or asks "who approved this?", you look it up here and answer with the actual row.

## 9. Email templates

**Emails** shows the exact HTML and plain text of every transactional message (welcome, verify, reset, request received/accepted, listing approved/rejected, mat-reminder). The renderer is the same one the sender calls, so the preview can never lie.

## 10. Every-day checklist

1. Dashboard → any pending gyms/mats? Clear them.
2. Reports → anything open? Action it with a written reason.
3. Users → spot-check new signups for obviously fake accounts.
4. Analytics → glance at zero-result searches for the coming week's expansion candidates.
5. Claims → grant or reject pending ownerships with a note.

## 11. When you're not sure

- **Don't delete users** — suspension is reversible, deletion isn't.
- **Don't approve what you wouldn't want on the public directory.** Submissions can always be re-edited by the submitter.
- **Reasons are the safety net.** If you write one honest sentence, any future colleague can defend the decision in a dispute.

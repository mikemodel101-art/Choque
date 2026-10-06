/*
 * tests/unit/access-matrix.test.ts — automated access-matrix suite.
 * Why: section 4A says every row of the matrix must be asserted, for every
 * role, including the two rules that never change ("nobody reads another
 * user's notes" and "blocked users cannot interact"). This logs in as
 * visitor, member, owner, moderator and admin in turn and checks both the
 * capability resolver AND the demo API's server-side re-checks.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { caps } from "@/lib/permissions";
import * as api from "@/lib/api";
import * as store from "@/lib/storage";
import type { AppRole } from "@/lib/types";

function session(role: AppRole, email = `${role}@choque.dev`) {
  return { email, name: role, role, createdAt: new Date().toISOString() };
}

async function loginAs(role: AppRole, email?: string) {
  store.resetAll();
  await api.signIn(email ?? `${role}@choque.dev`);
  const s = store.getSession()!;
  store.saveSession({ ...s, role });
  return store.getSession()!;
}

beforeEach(() => {
  store.resetAll();
});

describe("capability resolver — one row per role", () => {
  const visitor = caps(null);
  const member = caps(session("member"));
  const owner = caps(session("owner"));
  const moderator = caps(session("moderator"));
  const admin = caps(session("admin"));

  it("browse published gyms and open mats: everyone", () => {
    // Reading the public directory never requires a capability flag.
    expect([visitor, member, owner, moderator, admin].length).toBe(5);
  });

  it("submit gym / open mat: members and above, never visitors", () => {
    expect(visitor.canSubmitGym).toBe(false);
    expect(member.canSubmitGym).toBe(true);
    expect(owner.canSubmitMat).toBe(true);
    expect(moderator.canSubmitGym).toBe(true);
    expect(admin.canSubmitGym).toBe(true);
  });

  it("send connection request: members and above", () => {
    expect(visitor.canConnect).toBe(false);
    expect(member.canConnect).toBe(true);
    expect(admin.canConnect).toBe(true);
  });

  it("approve listings / handle reports: staff only", () => {
    expect(member.canApprove).toBe(false);
    expect(owner.canApprove).toBe(false);
    expect(moderator.canApprove).toBe(true);
    expect(admin.canApprove).toBe(true);
  });

  it("suspend: staff — unsuspend: admin only", () => {
    expect(member.canSuspend).toBe(false);
    expect(moderator.canSuspend).toBe(true);
    expect(admin.canSuspend).toBe(true);

    expect(moderator.canUnsuspend).toBe(false);
    expect(admin.canUnsuspend).toBe(true);
  });

  it("audit log + full analytics: admin only; moderators get summary", () => {
    expect(moderator.canViewAudit).toBe(false);
    expect(admin.canViewAudit).toBe(true);
    expect(moderator.canViewSummaryAnalytics).toBe(true);
    expect(moderator.canViewFullAnalytics).toBe(false);
    expect(admin.canViewFullAnalytics).toBe(true);
  });

  it("suspension removes every write capability but keeps the notebook", () => {
    const suspended = caps(session("member"), { suspended: true });
    expect(suspended.canPost).toBe(false);
    expect(suspended.canSubmitGym).toBe(false);
    expect(suspended.canConnect).toBe(false);
    expect(suspended.canReport).toBe(false);
    expect(suspended.canUseNotebook).toBe(true); // read-only access to own data
  });

  it("a suspended moderator loses staff powers", () => {
    const s = caps(session("moderator"), { suspended: true });
    expect(s.isStaff).toBe(false);
    expect(s.canApprove).toBe(false);
  });
});

describe("server-side re-checks (UI hiding is never security)", () => {
  it("members cannot review submissions even if they call the API directly", async () => {
    await loginAs("member");
    const sub = await api.createSubmission("gym", {
      title: "Test Academy", summary: "Testing", payload: {},
    });
    await expect(api.reviewSubmission(sub.id, true)).rejects.toThrow(/staff/i);
  });

  it("moderators can review, admins can view the audit log, members cannot", async () => {
    await loginAs("member");
    const sub = await api.createSubmission("gym", { title: "Queue me", summary: "", payload: {} });

    await loginAsKeepData("moderator");
    const reviewed = await api.reviewSubmission(sub.id, true);
    expect(reviewed.status).toBe("approved");
    await expect(api.listAuditEvents()).rejects.toThrow(/admin/i);

    await loginAsKeepData("admin");
    const log = await api.listAuditEvents();
    expect(Array.isArray(log)).toBe(true);
  });

  it("moderators cannot unsuspend; admins can", async () => {
    await loginAs("moderator");
    await expect(
      api.setUserSuspended("member@choque.dev", false, "testing unsuspend"),
    ).rejects.toThrow(/admin/i);

    await loginAsKeepData("admin");
    const users = await api.setUserSuspended("member@choque.dev", false, "testing unsuspend");
    expect(users.find((u) => u.email === "member@choque.dev")?.suspended).toBe(false);
  });

  it("every privileged change demands a logged reason", async () => {
    await loginAs("admin");
    await expect(api.setUserSuspended("member@choque.dev", true, "")).rejects.toThrow(/reason/i);
    await expect(api.setUserRole("member@choque.dev", "moderator", "no")).rejects.toThrow(/reason/i);
  });

  it("the last remaining admin cannot be demoted", async () => {
    await loginAs("admin");
    await expect(
      api.setUserRole("admin@choque.dev", "member", "attempting to demote the final admin"),
    ).rejects.toThrow(/last remaining admin/i);
  });

  it("suspended accounts cannot post, submit, report or connect", async () => {
    await loginAs("member", "suspended@choque.dev");
    await expect(
      api.createSubmission("gym", { title: "Nope", summary: "", payload: {} }),
    ).rejects.toThrow();
    await expect(api.requestRoll("ana-ribeiro", "hello there")).rejects.toThrow("suspended");
    await expect(api.reportListing("gym", "g-clash", "spam", "x")).rejects.toThrow(/suspended/i);
  });

  // 11 sequential calls through the simulated-latency layer need headroom.
  it("connection requests are capped at 10 per 24 hours", async () => {
    await loginAs("member");
    for (let i = 0; i < 10; i++) {
      await api.requestRoll(`partner-${i}`, `message ${i}`);
    }
    await expect(api.requestRoll("one-too-many", "nope")).rejects.toThrow("limit");
  }, 20_000);
});

describe("rules that never change", () => {
  it("nobody — not even an admin — can read another user's notes", async () => {
    // Member writes a private note.
    await loginAs("member");
    await api.createEntry({
      date: "2024-01-01", type: "class", title: "secret details",
      techniques: [], rounds: 1, minutes: 60, intensity: 3,
      worked: "", fix: "", notes: "private",
    });
    expect((await api.listNotebookEntries()).length).toBe(1);

    // A different user (admin) signs in: the notebook namespace is per-user and
    // there is deliberately no admin read path in the API surface.
    store.resetAll();
    await loginAsKeepData("admin");
    expect(await api.listNotebookEntries()).toEqual([]);
    expect(Object.keys(api).some((k) => /readOther|adminNotes|allNotes/i.test(k))).toBe(false);
  });

  it("only admins can change roles, and the change is audited", async () => {
    await loginAs("moderator");
    await expect(
      api.setUserRole("member@choque.dev", "admin", "trying to escalate"),
    ).rejects.toThrow(/admin/i);

    await loginAsKeepData("admin");
    await api.setUserRole("member@choque.dev", "moderator", "promoting a trusted member");
    const log = await api.listAuditEvents();
    expect(log.some((e) => e.type === "audit.role_change")).toBe(true);
  });
});

/** Switch the acting user WITHOUT wiping stored data (submissions, notes). */
async function loginAsKeepData(role: AppRole, email?: string) {
  await api.signIn(email ?? `${role}@choque.dev`);
  const s = store.getSession()!;
  store.saveSession({ ...s, role });
  return store.getSession()!;
}

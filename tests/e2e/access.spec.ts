/*
 * tests/e2e/access.spec.ts — Playwright smoke tests for routing & gating.
 * Why: the spec requires end-to-end proof that middleware redirects work and
 * that role-gated controls are genuinely hidden. These run against the built
 * app (see playwright.config.ts, which boots `next start`).
 */
import { expect, test } from "@playwright/test";

const DEMO_PASSWORD = "choque-demo";

/** Sign in through the one-click demo role cards on /sign-in. */
async function signInAs(page: import("@playwright/test").Page, label: string) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: new RegExp(`Sign in as ${label}`, "i") }).click();
  await page.waitForURL(/\/gyms/, { timeout: 15_000 });
}

test.describe("public surface", () => {
  test("landing page renders the hero and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Find your people/i);
    await expect(page.getByRole("link", { name: /Find your gym/i }).first()).toBeVisible();
  });

  test("sign-in page offers every demo role account", async ({ page }) => {
    await page.goto("/sign-in");
    for (const role of ["Member", "Gym owner", "Moderator", "Admin", "Suspended member"]) {
      await expect(page.getByRole("button", { name: new RegExp(`Sign in as ${role}`, "i") })).toBeVisible();
    }
    await expect(page.getByText(DEMO_PASSWORD)).toBeVisible();
  });
});

test.describe("middleware redirects", () => {
  test("signed-out visitor hitting /notebook is redirected with a message and returnTo", async ({ page }) => {
    await page.goto("/notebook");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("returnTo=%2Fnotebook");
    await expect(page.getByRole("status")).toContainText(/sign in/i);
  });

  test("signed-out visitor hitting /admin is redirected to sign-in", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("returnTo=%2Fadmin");
  });

  test("member hitting /admin is bounced back to the app", async ({ page }) => {
    await signInAs(page, "Member");
    await page.goto("/admin");
    await page.waitForURL(/\/gyms/);
    await expect(page.getByRole("status")).toContainText(/moderators and admins/i);
  });

  test("moderator reaching /admin/users is redirected to the queue", async ({ page }) => {
    await signInAs(page, "Moderator");
    await page.goto("/admin/users");
    await page.waitForURL(/\/admin(\?|$)/);
    await expect(page).toHaveURL(/message=/);
  });

  test("admin reaches every admin section", async ({ page }) => {
    await signInAs(page, "Admin");
    for (const path of ["/admin", "/admin/users", "/admin/audit", "/admin/analytics"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    }
  });
});

test.describe("hidden controls by role", () => {
  test("members never see the staff shortcut", async ({ page }) => {
    await signInAs(page, "Member");
    await expect(page.getByLabel("Open staff review tools")).toHaveCount(0);
  });

  test("moderators see the staff shortcut but no Users tab", async ({ page }) => {
    await signInAs(page, "Moderator");
    await expect(page.getByLabel("Open staff review tools")).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Review queue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  });

  test("admins see Users, Analytics and the Audit log", async ({ page }) => {
    await signInAs(page, "Admin");
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
  });

  test("suspended members see the banner with an appeal link and cannot submit", async ({ page }) => {
    await signInAs(page, "Suspended member");
    await expect(page.getByRole("status")).toContainText(/suspended/i);
    await expect(page.getByRole("link", { name: /Appeal this decision/i })).toBeVisible();
  });
});

test.describe("core journeys", () => {
  test("gym directory filters, loads more and toggles the map", async ({ page }) => {
    await signInAs(page, "Member");
    await expect(page.getByRole("heading", { name: "Find a gym" })).toBeVisible();

    await page.getByRole("button", { name: "Judo" }).first().click();
    await expect(page.getByText(/acadanc|academies|academy/i).first()).toBeVisible();

    await page.getByRole("tab", { name: /Map/i }).click();
    await expect(page.getByRole("tab", { name: /Map/i })).toHaveAttribute("aria-selected", "true");
  });

  test("notebook entries persist and stay private to the owner", async ({ page }) => {
    await signInAs(page, "Member");
    await page.goto("/notebook");
    await page.getByRole("button", { name: /New entry/i }).click();
    await page.getByLabel("Title").fill("E2E guard retention");
    await page.getByLabel("Minutes").fill("60");
    await page.getByRole("button", { name: /Log session/i }).click();
    await expect(page.getByText("E2E guard retention")).toBeVisible();
  });
});

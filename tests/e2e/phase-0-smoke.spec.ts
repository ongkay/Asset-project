import { expect, test } from "@playwright/test";

function expectLoginUrl(url: string) {
  return /\/login(?:\?|$)/.test(url);
}

async function expectNoRuntimeCrashAfterReload(page: import("@playwright/test").Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.reload();
  await page.waitForLoadState("networkidle");

  expect(pageErrors).toEqual([]);
}

test.describe("Phase 0 smoke", () => {
  test("renders /login without runtime crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/login");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("link", { name: /asset project/i })).toBeVisible();
    await expectNoRuntimeCrashAfterReload(page);
    expect(pageErrors).toEqual([]);
  });

  test("renders /reset-password without runtime crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/reset-password");

    await expect(page).toHaveURL(/\/reset-password(?:\?|$)/);
    await expect(page.getByRole("link", { name: /back to login/i })).toBeVisible();
    await expectNoRuntimeCrashAfterReload(page);
    expect(pageErrors).toEqual([]);
  });

  test("redirects guest access from /console to /login", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/console");
    await page.waitForLoadState("networkidle");

    expect(expectLoginUrl(page.url())).toBe(true);
    await expect(page.getByRole("link", { name: /asset project/i })).toBeVisible();
    await expectNoRuntimeCrashAfterReload(page);
    expect(pageErrors).toEqual([]);
  });

  test("redirects guest access from /admin to /login", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    expect(expectLoginUrl(page.url())).toBe(true);
    await expect(page.getByRole("link", { name: /asset project/i })).toBeVisible();
    await expectNoRuntimeCrashAfterReload(page);
    expect(pageErrors).toEqual([]);
  });
});

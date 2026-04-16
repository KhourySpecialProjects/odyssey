import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("Content Editor Navigation Tests", () => {
  test.use({
    storageState: "e2e/contentEditor/auth.json",
  });

  test("can access Activity page", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/Hi,/);
  });

  test("can access Explore page", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  });

  test("can access Settings page", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await expect(page.locator("h1")).toContainText("Profile");
  });

  test("can access a droplet page", async ({ page }) => {
    await page.goto(`${BASE_URL}/d/building-your-first-app-wolly-s-mobile`);
    await expect(page.locator("h1")).toContainText("Building Your First App");
  });

  test("can access review page", async ({ page }) => {
    await page.goto(`${BASE_URL}/review`);
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("Content Editor Workflow Tests", () => {
  test.use({
    storageState: "e2e/contentEditor/auth.json",
  });

  test("Activity page sidebar tabs work", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);
    await page.getByRole("button", { name: "Droplets" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("Settings form fields are visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await expect(page.getByRole("textbox", { name: /Bio/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save/i })).toBeVisible();
  });
});

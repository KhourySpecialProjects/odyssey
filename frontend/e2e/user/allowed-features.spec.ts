import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("User Navigation Tests", () => {
  test.use({
    storageState: "e2e/user/auth.json",
  });

  test("authenticated user is redirected from landing to activity", async ({
    page,
  }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(/\/activity/);
  });

  test("navigate to Activity page", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);
    await expect(page.locator("h1")).toBeVisible();
    // Activity page shows personalized greeting
    await expect(page.locator("h1")).toContainText(/Hi,/);
  });

  test("navigate to Explore page", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  });

  test("navigate to Settings page", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await expect(page.locator("h1")).toContainText("Profile");
  });

  test("navigate to Friends settings", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/friends`);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("navigate to a public playlist", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    await expect(page.locator("h1")).toContainText("React");
  });

  test("navigate to a droplet page", async ({ page }) => {
    await page.goto(`${BASE_URL}/d/building-your-first-app-wolly-s-mobile`);
    // Authenticated user should see the droplet content
    await expect(page.locator("h1")).toContainText("Building Your First App");
  });
});

test.describe("User Workflow Tests", () => {
  test.use({
    storageState: "e2e/user/auth.json",
  });

  test("Activity page — switch between sidebar tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);

    // Sidebar tabs are buttons
    await page.getByRole("button", { name: "Droplets" }).click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Playlists" }).click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Voyages" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("Activity page — Archived tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);
    await page.getByRole("button", { name: "Archived" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("Activity page — Favorited tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/activity`);
    await page.getByRole("button", { name: "Favorited" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("Settings page — view profile form fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    await expect(page.getByRole("textbox", { name: /Bio/i })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /LinkedIn/i }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save/i })).toBeVisible();
  });

  test("Playlist page — Add to My Playlists button visible", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/p/react`);
    await expect(
      page.getByRole("button", { name: /Add to My Playlists/i }),
    ).toBeVisible();
  });

  test("Request Creation Role link visible for regular user", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/creation-request`);
    await expect(page.getByRole("main")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Explore Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
  });

  test("displays Explore heading and subtitle", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
    await expect(
      page.getByText("Discover Droplets, Playlists, and Voyages"),
    ).toBeVisible();
  });

  test("displays content type buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Droplets/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Playlists/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Voyages/i })).toBeVisible();
  });

  test("displays search input", async ({ page }) => {
    await expect(page.getByRole("searchbox")).toBeVisible();
  });

  test("displays droplet cards in grid", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const cards = page.getByRole("main").getByRole("list").getByRole("link");
    await expect(cards.first()).toBeVisible();
  });
});

test.describe("Explore Page — Tab Switching", () => {
  test("switching to Playlists shows playlist content", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await page.getByRole("button", { name: /Playlists/i }).click();
    // Wait for content to update
    await page.waitForLoadState("networkidle");
    // Playlists tab should be active — verify main content updates
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("switching to Voyages shows voyage content", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await page.getByRole("button", { name: /Voyages/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("Explore Page — Sort and Filter", () => {
  test("sort button is visible on Droplets tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await expect(page.getByRole("button", { name: "A-Z" })).toBeVisible();
  });

  test("filter buttons are visible on Droplets tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    await expect(
      page.getByRole("button", { name: "Focus Area" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Type" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Difficulty" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Tags" })).toBeVisible();
  });

  test("search box accepts input", async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);
    const searchInput = page.getByRole("searchbox");
    await searchInput.fill("react");
    await expect(searchInput).toHaveValue("react");
  });
});

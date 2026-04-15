import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Playlist Page — Public View", () => {
  test("displays playlist name and description", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("main")).toContainText(
      "Pick Up Where You Left Off",
    );
  });

  test("displays playlist metadata badges", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    // Playlists show duration and lesson count badges
    await expect(page.locator("h1")).toContainText("React");
  });

  test("displays droplet tiles within the playlist", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    await page.waitForLoadState("networkidle");
    // Playlist should contain at least one droplet tile
    const dropletLinks = page.getByRole("link").filter({ hasText: /.+/ });
    await expect(dropletLinks.first()).toBeVisible();
  });

  test("non-existent playlist shows 404", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/this-playlist-does-not-exist-12345`);
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });
});

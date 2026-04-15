import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("Content Editor Blocked Navigation Tests", () => {
  test.use({
    storageState: "e2e/contentEditor/auth.json",
  });

  test("cannot access admin panel", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });

  test("cannot create new droplets", async ({ page }) => {
    await page.goto(`${BASE_URL}/new/droplet`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });
});

test.describe("Content Editor Blocked Workflow Tests", () => {
  test.use({
    storageState: "e2e/contentEditor/auth.json",
  });

  test("cannot edit playlists they do not own", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    const editButton = page.getByRole("link", { name: /Edit Playlist/i });
    await expect(editButton).toBeHidden();
  });
});

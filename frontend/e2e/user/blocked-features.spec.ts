import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("User Blocked Navigation Tests", () => {
  test.use({
    storageState: "e2e/user/auth.json",
  });

  test("cannot access admin panel", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });

  test("cannot access draft editing pages", async ({ page }) => {
    await page.goto(`${BASE_URL}/draft/d/test1`);
    await expect(page.locator("h1")).toContainText(
      /Page Not Found|Unauthorized/,
    );
  });

  test("cannot access new droplet creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/new/droplet`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });

  test("cannot access new playlist creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/new/playlist`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });
});

test.describe("User Blocked Workflow Tests", () => {
  test.use({
    storageState: "e2e/user/auth.json",
  });

  test("cannot see Edit button on playlists they do not own", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/p/react`);
    const editButton = page.getByRole("link", { name: /Edit Playlist/i });
    await expect(editButton).toBeHidden();
  });
});

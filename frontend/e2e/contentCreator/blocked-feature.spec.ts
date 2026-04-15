import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("Content Creator Blocked Navigation Tests", () => {
  test.use({
    storageState: "e2e/contentCreator/auth.json",
  });

  test("cannot access admin panel", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.locator("h1")).toContainText(
      /Unauthorized|Page Not Found/,
    );
  });
});

test.describe("Content Creator Blocked Workflow Tests", () => {
  test.use({
    storageState: "e2e/contentCreator/auth.json",
  });

  test("cannot edit playlists they do not own", async ({ page }) => {
    await page.goto(`${BASE_URL}/p/react`);
    const editButton = page.getByRole("link", { name: /Edit Playlist/i });
    await expect(editButton).toBeHidden();
  });
});

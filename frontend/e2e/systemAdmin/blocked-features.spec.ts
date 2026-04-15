import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("System Admin Blocked Navigation Tests", () => {
  test.use({
    storageState: "e2e/systemAdmin/auth.json",
  });

  test("non-existent page returns 404", async ({ page }) => {
    await page.goto(`${BASE_URL}/this-page-does-not-exist`);
    await expect(page.locator("h1")).toContainText("Page Not Found");
  });
});

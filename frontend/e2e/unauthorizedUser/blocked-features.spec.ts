import { test, expect } from "@playwright/test";

test.describe("Unauthorized Navigation Tests", () => {
  test.use({
    storageState: "e2e/unauthorizedUser/auth.json",
  });

  test("Navigate to Content Creator", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/content-creators");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
    await expect(page.getByRole("main")).toContainText("404");
  });

  test("Navigate to a Droplet", async ({ page }) => {
    await page.goto(
      "https://dev.khouryodyssey.org/d/building-your-first-app-wolly-s-mobile",
    );
    await expect(page.getByRole("heading")).toContainText("Log In");
  });

  test("Navigate to Dashboard", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/dashboard");
    await expect(page.getByRole("main")).toContainText("404");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });

  test("Navigate to a Droplet Draft", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/draft/d/test1");
    await expect(page.getByRole("main")).toContainText("404");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });
  test("Navigate to Drafts Page", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/draft");
    await expect(page.getByRole("main")).toContainText("404");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });
  test("Navigate to group page dashboard", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/g/dashboard");
    await expect(page.getByRole("heading")).toContainText("Unauthorized");
    await expect(page.getByRole("main")).toContainText("Error");
  });
  test("Navigate to groups management", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/g/management");
    await expect(page.getByRole("main")).toContainText("404");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });
  test("Navigate to settings", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/settings");
    await expect(page.getByRole("main")).toContainText("404");
    await expect(page.getByRole("heading")).toContainText("Page Not Found");
  });
});

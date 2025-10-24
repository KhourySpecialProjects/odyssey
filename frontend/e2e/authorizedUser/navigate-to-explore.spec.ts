import { test, expect } from "@playwright/test";

test.use({
  storageState: "e2e/authorizedUser/auth.json",
});

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("main").getByRole("link", { name: "Explore" }).click();
  await page.getByRole("searchbox", { name: "Search..." }).click();
  await expect(page.getByRole("main")).toContainText("Search");
  await page.getByRole("button", { name: "Type" }).click();
  await expect(page.locator("main")).toContainText("A-Z");
});

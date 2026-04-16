import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Unauthorized Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/unauthorized`);
  });

  test("displays unauthorized error message", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Unauthorized" }),
    ).toBeVisible();
    await expect(
      page.getByText("You do not have permission to access this application."),
    ).toBeVisible();
  });

  test("displays Request Access link in main content", async ({ page }) => {
    await expect(
      page.getByRole("main").getByRole("link", { name: "Request Access" }),
    ).toBeVisible();
  });

  test("displays Explore the Odyssey link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Explore the Odyssey" }),
    ).toBeVisible();
  });

  test("Request Access navigates to request form", async ({ page }) => {
    await page
      .getByRole("main")
      .getByRole("link", { name: "Request Access" })
      .click();
    await expect(page).toHaveURL(/\/request-access/);
  });

  test("Explore the Odyssey navigates to explore page", async ({ page }) => {
    await page.getByRole("link", { name: "Explore the Odyssey" }).click();
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  });
});

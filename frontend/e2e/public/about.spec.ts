import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("About Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/about`);
  });

  test("displays About Odyssey heading and description", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "About Odyssey" }),
    ).toBeVisible();
    await expect(page.getByText("Odyssey is an all-new on-")).toBeVisible();
  });

  test("displays Types section with heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Types" })).toBeVisible();
    await expect(page.getByText(/Understand how you.ll learn/)).toBeVisible();
  });

  test("displays Focus Areas section with heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Focus Areas" }),
    ).toBeVisible();
    await expect(page.getByText(/Understand what you.ll learn/)).toBeVisible();
  });
});

test.describe("About Page Navigation", () => {
  test("can navigate to About from landing page footer", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole("link", { name: "About Odyssey" }).click();
    await expect(
      page.getByRole("heading", { name: "About Odyssey" }),
    ).toBeVisible();
  });
});

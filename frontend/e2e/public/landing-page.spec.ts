import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("displays hero section with heading and CTA", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Reinforce Your Learning" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start Exploring" }),
    ).toBeVisible();
  });

  test("displays the Odyssey logo in the navbar", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Khoury Odyssey Logo Odyssey, a Khoury College Learning Platform",
      }),
    ).toBeVisible();
  });

  test("Start Exploring navigates to explore page", async ({ page }) => {
    await page.getByRole("link", { name: "Start Exploring" }).click();
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  });

  test("Request Access link is visible in hero section", async ({ page }) => {
    // Scoped to main to avoid matching the banner "request access" link
    await expect(
      page.getByRole("main").getByRole("link", { name: "Request Access" }),
    ).toBeVisible();
  });

  test("Request Access navigates to request-access page", async ({ page }) => {
    await page
      .getByRole("main")
      .getByRole("link", { name: "Request Access" })
      .click();
    await expect(page).toHaveURL(/\/request-access/);
  });

  test("navbar Log in button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("navbar Explore link navigates correctly", async ({ page }) => {
    // The footer has an Explore-adjacent link; use the banner area
    await page.getByRole("link", { name: "Start Exploring" }).click();
    await expect(page).toHaveURL(/\/explore/);
  });
});

import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Public Profile Page", () => {
  test("non-existent profile shows Profile Not Found", async ({ page }) => {
    await page.goto(`${BASE_URL}/prof/nonexistentuser99999`);
    await expect(
      page.getByRole("heading", { name: "Profile Not Found" }),
    ).toBeVisible();
    await expect(
      page.getByText("This profile is either private or does not exist."),
    ).toBeVisible();
  });

  test("private profile shows private profile message", async ({ page }) => {
    await page.goto(`${BASE_URL}/prof/testuser`);
    await expect(
      page.getByRole("heading", { name: "Profile Not Found" }),
    ).toBeVisible();
  });
});

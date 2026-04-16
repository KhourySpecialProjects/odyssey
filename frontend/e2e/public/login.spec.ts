import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test("displays Log In heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  });

  test("displays authentication description text", async ({ page }) => {
    await expect(
      page.getByText("Authenticate with GitHub or with your Northeastern"),
    ).toBeVisible();
  });

  test("displays My Northeastern login button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Log in with My Northeastern" }),
    ).toBeVisible();
  });

  test("displays GitHub login button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Log in with GitHub" }),
    ).toBeVisible();
  });
});

test.describe("Login Page — Redirect", () => {
  test("unauthenticated access to protected route redirects to login", async ({
    page,
  }) => {
    // Droplet pages require auth per middleware config
    await page.goto(`${BASE_URL}/d/some-droplet`);
    await expect(page).toHaveURL(/\/auth\/login|\/api\/auth/);
  });

  test("unauthenticated access to admin redirects to login", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/auth\/login|\/api\/auth/);
  });
});

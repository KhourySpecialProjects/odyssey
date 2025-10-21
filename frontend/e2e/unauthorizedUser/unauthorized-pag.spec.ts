import { test, expect } from "@playwright/test";

test.use({
  storageState: "auth.json",
});

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Log in with GitHub" }).click();
  await expect(page.getByRole("main")).toMatchAriaSnapshot(`
    - paragraph: Error
    - heading "Unauthorized" [level=1]
    - paragraph: You do not have permission to access this application.
    - link "Request Access":
      - /url: /request-access
      - img
    - link "Explore the Odyssey":
      - /url: /explore
      - img
    `);
});

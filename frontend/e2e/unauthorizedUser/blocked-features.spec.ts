import { test, expect } from "@playwright/test";

test.describe("Unauthorized Navigation Tests", () => {
  test.use({
    storageState: "e2e/unauthorizedUser/auth.json",
  });

  test("Navigate to Dashboard", async ({ page }) => {});
});

test.describe("Unauthorized Workflow Tests", () => {});

import { test as base, expect } from "@playwright/test";

/** Base URL for all E2E tests — points to the dev deployment */
export const BASE_URL = "https://dev.khouryodyssey.org";

/** Common selectors used across multiple tests */
export const SELECTORS = {
  logo: { role: "link" as const, name: "Khoury Odyssey Logo Odyssey," },
  notFound: { heading: "Page Not Found", status: "404" },
} as const;

/**
 * Extended test fixture with common helpers.
 * Use `odysseyTest` instead of `test` for convenient navigation and assertions.
 */
export const odysseyTest = base.extend<{
  /** Navigate to a path on the dev site */
  navigateTo: (path: string) => Promise<void>;
}>({
  navigateTo: async ({ page }, use) => {
    await use(async (path: string) => {
      await page.goto(`${BASE_URL}${path}`);
    });
  },
});

export { expect };

import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { BASE_URL } from "../fixtures";

// The streak pill and its popover (ODY-919), for any signed-in `user`: a
// learner with no streak yet still sees the pill at 0.

async function openStreak(page: Page) {
  await page.goto(`${BASE_URL}/explore`);
  await page.getByRole("button", { name: /-day streak/ }).click();
  const popover = page.getByRole("dialog");
  await expect(
    popover.getByRole("table", { name: /^Your activity in / }),
  ).toBeVisible();
  return popover;
}

test.describe("Streak pill", () => {
  test.use({ storageState: "e2e/user/auth.json" });

  test.beforeEach(async ({ page }) => {
    // auth.json carries localStorage: a saved theme would skew the run
    await page.addInitScript(() => localStorage.removeItem("theme"));
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`the pill and popover pass axe in ${scheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openStreak(page);
      const html = page.locator("html");
      if (scheme === "dark") await expect(html).toHaveClass(/\bdark\b/);
      else await expect(html).not.toHaveClass(/\bdark\b/);

      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .include('button[aria-label*="-day streak"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    });
  }

  test("fits a 390 px screen and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const popover = await openStreak(page);

    const box = await popover.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(
      page.getByRole("button", { name: /-day streak/ }),
    ).toBeFocused();
  });
});

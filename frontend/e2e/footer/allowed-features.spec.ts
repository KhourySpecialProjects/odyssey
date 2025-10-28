import { test, expect } from "@playwright/test";

test.describe("Allowed Footer Navigation Tests", () => {
  test("Navigate To Landing Page", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await page.getByRole("link", { name: "About Odyssey" }).click();
    await expect(
      page.getByRole("heading", { name: "About Odyssey" }),
    ).toBeVisible();
  });

  test("Navigate to About Odyssey", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("link", { name: "About Odyssey" }).click();
    await expect(
      page.getByRole("heading", { name: "About Odyssey" }),
    ).toBeVisible();
    await expect(page.getByText("Odyssey is an all-new on-")).toBeVisible();
  });

  test("Navigate to Features", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Features" }).click();
    // if you want to assert that something is NOT visible for a user
    await expect(page.getByText("Gallery not found")).toBeHidden();
  });

  test("Navigate to Contributors", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Contributors" }).click();
    await expect(
      page.getByRole("heading", { name: "Website Creators" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Content Creators" }),
    ).toBeVisible();
  });
  test("Go to Github", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    const page1Promise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Odyssey Github Repo" }).click();
    const page1 = await page1Promise;

    // Wait for the new page to navigate to the GitHub URL
    await expect(page1.url()).toBe(
      "https://github.com/KhourySpecialProjects/odyssey",
    );
  });
});

test.describe("Footer Flows", () => {
  test("Reporting a bug", async ({ page }) => {
    await page.goto('https://dev.khouryodyssey.org/');
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Report Bug" }).click();
    await expect(
      page.getByRole("heading", { name: "Report Bug" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Full Name" }).click();
    await page
      .getByRole("textbox", { name: "Full Name" })
      .fill("Johan Almanzar");
    await page.getByRole("textbox", { name: "Email" }).click();
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("j.almanzar@northeastern.edu");
    await expect(page.getByRole("textbox", { name: "Path" })).toHaveValue("/");
    await page.getByRole("textbox", { name: "Description" }).click();
    await page
      .getByRole("textbox", { name: "Description" })
      .fill("something big!");
    await page.getByRole("button", { name: "Submit Report" }).click();
    await expect(
      page
        .getByRole("region", { name: "Notifications alt+T" })
        .getByRole("listitem"),
    ).toBeVisible();
  });
});

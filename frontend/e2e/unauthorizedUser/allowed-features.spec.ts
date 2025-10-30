import { test, expect } from "@playwright/test";

test.describe("Unauthorized Navigation Tests", () => {
  test.use({
    storageState: "e2e/unauthorizedUser/auth.json",
  });

  test("Navigate to Request Access Form", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/unauthorized");
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Request Access", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Request Access" }),
    ).toBeVisible();
    await expect(page.getByText("Currently, only a limited")).toBeVisible();
  });

  test("Navigate to Explore", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/explore");
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
    await expect(page.getByRole("heading")).toContainText("Explore");
  });
  test("Navigate to playlists", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/p/react");
    await expect(page.locator("h1")).toContainText("React");
    await expect(page.getByRole("main")).toContainText(
      "Pick Up Where You Left Off",
    );
  });
});

test.describe("Unauthorized Workflow Tests", () => {
  test.use({
    storageState: "e2e/unauthorizedUser/auth.json",
  });

  test("Submitting Unique Request Access Flow", async ({ page }) => {
    // Generate a unique email using timestamp
    const uniqueEmail = `j.almanzar+test${Date.now()}@northeastern.edu`;

    // Mock the API endpoint to accept the unique email
    await page.route("*/**/api/access-requests", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Mock a successful response
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: Math.floor(Math.random() * 10000),
          email: postData.email,
          firstName: postData.firstName,
          lastName: postData.lastName,
          status: "pending",
        }),
      });
    });

    await page.goto("https://dev.khouryodyssey.org/unauthorized");
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "request access", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Submit Request" }),
    ).toBeVisible();

    await page.getByRole("textbox", { name: "Given/First Name" }).click();
    await page.getByRole("textbox", { name: "Given/First Name" }).fill("Johan");
    await page.getByRole("textbox", { name: "Family/Last Name" }).click();
    await page
      .getByRole("textbox", { name: "Family/Last Name" })
      .fill("Almanzar");
    await page.locator("div").filter({ hasText: "Email" }).nth(4).click();
    await page.locator("div").filter({ hasText: "Email" }).nth(4).click();
    await page.getByRole("textbox", { name: "Email" }).fill(uniqueEmail);
    await page.getByRole("combobox", { name: "Affiliation" }).click();
    await page.getByRole("option", { name: "Undergraduate Student" }).click();
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "College" }).click();
    await expect(
      page.getByRole("option", { name: "Bouvé College of Health" }),
    ).toBeVisible();

    await page
      .getByLabel("Khoury College of Computer")
      .getByText("Khoury College of Computer")
      .click();
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(
      page.getByRole("heading", { name: "Reinforce Your Learning and" }),
    ).toBeVisible();
  });

  test("Submitting Repeated Request Access Flow", async ({ page }) => {
    await page.goto("https://dev.khouryodyssey.org/unauthorized");
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "request access", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Submit Request" }),
    ).toBeVisible();

    await page.getByRole("textbox", { name: "Given/First Name" }).click();
    await page.getByRole("textbox", { name: "Given/First Name" }).fill("Johan");
    await page.getByRole("textbox", { name: "Family/Last Name" }).click();
    await page
      .getByRole("textbox", { name: "Family/Last Name" })
      .fill("Almanzar");
    await page.getByRole("textbox", { name: "Email" }).click();
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("j.almanzar@northeastern.edu");
    await page.getByText("AffiliationSelect your").click();
    await expect(
      page.getByRole("option", { name: "Undergraduate Student" }),
    ).toBeVisible();

    await page
      .getByLabel("Undergraduate Student")
      .getByText("Undergraduate Student")
      .click();
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "College" }).click();
    await expect(
      page.getByRole("option", { name: "Bouvé College of Health" }),
    ).toBeVisible();

    await page
      .getByLabel("Khoury College of Computer")
      .getByText("Khoury College of Computer")
      .click();
    await expect(
      page.getByRole("link", { name: "Khoury Odyssey Logo Odyssey," }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(
      page.getByLabel("Notifications alt+T").getByRole("listitem"),
    ).toContainText("Uh oh! Something went wrong.");
  });
});

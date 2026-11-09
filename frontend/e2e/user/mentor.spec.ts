import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { encodeMentorEvent, type MentorEvent } from "../../lib/mentor/events";
import { BASE_URL } from "../fixtures";

const DROPLET_SLUG = "fundamentals-of-data-science";
const LESSON_SLUG = "exploratory-data-analysis-concepts-and-techniques-1";
// TODO(ODY-887): confirm on dev. A `data-block-id` of a paragraph in that lesson.
const CITED_BLOCK_ID = "faa7cf3b-3776-4130-8de5-520be95ee675";
const CITED_BLOCK_INDEX = 2;

const LESSON_PATH = `/d/${DROPLET_SLUG}/${LESSON_SLUG}`;
const ANSWER = "A droplet is a bite-sized lesson";
const SOURCE_LABEL = "Mentor test source";

const sse = (events: MentorEvent[]) => events.map(encodeMentorEvent).join("");
const answerEvents = (text: string): MentorEvent[] => [
  { type: "text", text: `${text} [p2].` },
  {
    type: "done",
    truncated: false,
    citations: [
      {
        ref: "p2",
        anchor: { v: 1, field: "blocks", blockId: CITED_BLOCK_ID },
        blockIndex: CITED_BLOCK_INDEX,
        label: SOURCE_LABEL,
      },
    ],
  },
];

async function mockAnswer(page: Page, text = ANSWER) {
  await page.route("**/api/mentor", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse(answerEvents(text)),
    }),
  );
}

/** Registered after mockAnswer, so it wins: the answer takes 20 s, Stop ends it. */
async function mockSlowAnswer(page: Page) {
  await page.route("**/api/mentor", async (route) => {
    await new Promise((r) => setTimeout(r, 20_000));
    await route
      .fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse(answerEvents("Too slow")),
      })
      .catch(() => {});
  });
}

async function openMentor(page: Page, { acceptNotice = true } = {}) {
  await page.goto(`${BASE_URL}${LESSON_PATH}`);
  await page.getByRole("button", { name: "Ask Mentor", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Mentor", exact: true });
  await expect(dialog).toBeVisible();
  if (acceptNotice)
    await dialog.getByRole("button", { name: "Got it", exact: true }).click();
  return dialog;
}

/** The message list only: the sr-only live region repeats the answer's text. */
const conversationOf = (dialog: Locator) =>
  dialog.getByRole("list", { name: "Conversation", exact: true });

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

/** Cleanup that logs instead of throwing, so it can't hide the real failure. */
async function deleteSavedNote(page: Page) {
  try {
    const bar = page.locator(".sliding-notes-bar");
    if (
      !(await bar
        .getByRole("heading", { name: "My Notes", exact: true })
        .isVisible())
    ) {
      await page
        .getByRole("button", { name: "View Notes Bar", exact: true })
        .click();
    }
    const trash = bar
      .locator("div")
      .filter({ has: bar.getByText(ANSWER) })
      .filter({ has: bar.getByTestId("deleteNote") })
      .last()
      .getByTestId("deleteNote")
      .first();
    if (!(await trash.isVisible())) return;
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "POST" &&
          !!r.request().headers()["next-action"] &&
          new URL(r.url()).pathname === LESSON_PATH &&
          r.status() < 400,
        { timeout: 10_000 },
      ),
      trash.click(),
    ]);
  } catch (error) {
    console.warn("Mentor spec: couldn't delete the saved note", error);
  }
}

const ask = async (page: Page, question: string) => {
  const box = page.getByRole("textbox", {
    name: "Ask about this lesson",
    exact: true,
  });
  await box.fill(question);
  await box.press("Enter");
};

test.describe("Mentor sidebar", () => {
  test.use({ storageState: "e2e/user/auth.json" });

  test.beforeEach(async ({ page }) => {
    for (const [name, value] of [
      ["LESSON_SLUG", LESSON_SLUG],
      ["CITED_BLOCK_ID", CITED_BLOCK_ID],
    ]) {
      expect(
        value,
        `Set ${name} at the top of mentor.spec.ts to a real dev lesson (ODY-887)`,
      ).not.toMatch(/^TODO/);
    }
    // auth.json carries localStorage: a saved theme or notice would skew the run
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
      localStorage.removeItem("mentor-notice-v1");
    });
  });

  test("ask, Source, Save to notes, Stop and Esc", async ({ page }) => {
    test.slow();
    await mockAnswer(page);
    await page.goto(`${BASE_URL}${LESSON_PATH}`);
    await page.getByRole("button", { name: "Ask Mentor", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Mentor", exact: true });
    await expect(dialog).toBeVisible();

    // The first-use notice gates the composer until "Got it"
    await expect(
      page.getByRole("textbox", { name: "Ask about this lesson", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Got it", exact: true }).click();

    await dialog
      .getByRole("button", { name: "Summarize this lesson", exact: true })
      .click();
    const convo = conversationOf(dialog);
    await expect(convo.getByText(ANSWER)).toBeVisible();
    await expect(convo.getByText("[p2]")).toHaveCount(0);

    // A Source scrolls its passage into view
    await dialog
      .getByRole("button", {
        name: `Show in lesson: ${SOURCE_LABEL}`,
        exact: true,
      })
      .click();
    await expect(
      page.locator(`[data-block-id="${CITED_BLOCK_ID}"]`),
    ).toBeInViewport();

    try {
      await dialog
        .getByRole("button", { name: "Save to notes", exact: true })
        .click();
      await page
        .getByRole("button", { name: "View notes", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "My Notes", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(".sliding-notes-bar").getByText(ANSWER),
      ).toBeVisible();
    } finally {
      await deleteSavedNote(page);
    }

    // Back to Mentor (the conversation was kept), then Stop a slow answer
    await page.getByRole("button", { name: "Ask Mentor", exact: true }).click();
    await mockSlowAnswer(page);
    await ask(page, "Tell me more");
    await dialog.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(convo.getByText("Stopped", { exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Ask Mentor", exact: true }),
    ).toBeFocused();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`the sheet passes axe in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await mockAnswer(page);
      const dialog = await openMentor(page, { acceptNotice: false });
      const html = page.locator("html");
      if (scheme === "dark") await expect(html).toHaveClass(/\bdark\b/);
      else await expect(html).not.toHaveClass(/\bdark\b/);

      // First with the notice showing, then with an answer
      await expectNoAxeViolations(page);
      await dialog.getByRole("button", { name: "Got it", exact: true }).click();
      await dialog
        .getByRole("button", { name: "Summarize this lesson", exact: true })
        .click();
      await expect(conversationOf(dialog).getByText(ANSWER)).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }

  test("fills a 390 px screen and closing shows the lesson", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openMentor(page);

    expect(await dialog.boundingBox()).toMatchObject({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    });

    await dialog
      .getByRole("button", { name: "Close Mentor", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".lesson-wrapper")).toBeVisible();
  });

  test("renders a link and a script in an answer as plain text", async ({
    page,
  }) => {
    await mockAnswer(
      page,
      "See [the docs](https://example.invalid/docs) <script>window.__pwned = 1</script>",
    );
    const dialog = await openMentor(page);
    await dialog
      .getByRole("button", { name: "Summarize this lesson", exact: true })
      .click();
    await expect(conversationOf(dialog).getByText("the docs")).toBeVisible();

    await expect(dialog.locator("a")).toHaveCount(0);
    await expect(dialog.locator("script")).toHaveCount(0);
    expect(await page.evaluate(() => "__pwned" in window)).toBe(false);
  });
});

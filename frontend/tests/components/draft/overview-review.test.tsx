import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewReview } from "@/components/draft/review/overview-review";
import {
  addComment,
  getMyReview,
  getOrOpenReview,
} from "@/lib/requests/reviews";
import { SELECTION_DELAY_MS } from "@/lib/selection";
import type { ReviewComment } from "@/types";

jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
}));
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

// jest.setup's document.createRange stubs each range's rect
beforeAll(() => {
  Range.prototype.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: 20,
      left: 0,
      right: 40,
      width: 40,
      height: 20,
    }) as DOMRect;
  Range.prototype.getClientRects = function () {
    return [this.getBoundingClientRect()] as unknown as DOMRectList;
  };
});

const droplet = {
  name: "Loops",
  description: "<p>Learn how loops repeat code.</p>",
  overview: "<p>This droplet covers for and while loops.</p>",
  focusArea: "technical",
  type: "knowledge",
  difficulty: "beginner",
  tags: [],
  learningObjectives: [
    { id: 1, objective: "Write a for loop" },
    { id: 2, objective: "Stop a loop early" },
  ],
  nextSteps: [],
  prerequisites: [],
  postrequisites: [],
  funFact: "",
  datasets: [],
} as never;

const quote = (
  id: number,
  field: "name" | "description" | "overview" | "objective",
  text: string,
): ReviewComment => ({
  id,
  field,
  anchor: {
    v: 1,
    field,
    start: 0,
    end: 0,
    quote: text,
    prefix: "",
    suffix: "",
  },
  body: `About ${text}`,
  resolvedAt: null,
});

const review = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "open",
  comments: [
    quote(1, "description", "repeat"),
    quote(2, "overview", "while loops"),
    quote(3, "objective", "Stop a loop"),
    // A lesson comment, which the Overview leaves out
    {
      ...quote(4, "objective", "x"),
      field: "blocks",
      lesson: { id: 5 },
    },
  ],
};

async function mount() {
  render(
    <OverviewReview droplet={droplet} authors={[]} dropletId={3}>
      <div data-testid="overview-editors">Editors</div>
    </OverviewReview>,
  );
  await act(async () => {});
}

const mark = (field: string, id: number) =>
  within(screen.getByTestId(`overview-review-${field}`))
    .getAllByText(
      (_, el) => el?.getAttribute("data-anchor-id") === `comment-${id}`,
    )
    .map((el) => el.textContent)
    .join("");

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(getMyReview)
    .mockResolvedValue({ ok: true, error: null, data: review } as never);
});

describe("OverviewReview", () => {
  it("opens in Comment mode and counts only the Overview's comments", async () => {
    await mount();

    expect(screen.getByRole("button", { name: "Comment" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("review-comment-strip")).toHaveTextContent(
      "3 comments on the Overview3 pending · sent when you request changes",
    );
    expect(getMyReview).toHaveBeenCalledWith(3);
  });

  it("draws one comment in each field kind", async () => {
    await mount();

    expect(mark("description", 1)).toBe("repeat");
    expect(mark("overview", 2)).toBe("while loops");
    expect(mark("objective", 3)).toBe("Stop a loop");
  });

  it("numbers the comments across the Overview", async () => {
    await mount();

    expect(
      screen.getByRole("button", { name: "Comment 1, pending: “repeat”" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Comment 3, pending: “Stop a loop”" }),
    ).toBeInTheDocument();
  });

  it("keeps the text on the page while a tag is hovered", async () => {
    const user = userEvent.setup();
    await mount();
    // A selection being dragged out lives in these nodes
    const paragraph = screen
      .getByTestId("overview-review-overview")
      .querySelector("p")!;

    await user.hover(
      screen.getByRole("button", { name: "Comment 1, pending: “repeat”" }),
    );

    expect(paragraph.isConnected).toBe(true);
  });

  it("Read shows the Overview with no comments", async () => {
    const user = userEvent.setup();
    await mount();

    await user.click(screen.getByRole("button", { name: "Read" }));

    expect(screen.getByTestId("frozen-overview")).toHaveTextContent(
      "This droplet covers for and while loops.",
    );
    expect(document.querySelector("[data-anchor-id]")).toBeNull();
    expect(screen.queryByTestId("review-comment-strip")).toBeNull();
  });

  it("Edit shows the editors, and Stop editing comes back and reloads after the autosave", async () => {
    jest.useFakeTimers();
    try {
      await mount();
      act(() => screen.getByRole("button", { name: "Edit" }).click());
      expect(screen.getByTestId("overview-editors")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "You're editing the Overview during its review.",
      );

      act(() => screen.getByRole("button", { name: "Stop editing" }).click());
      expect(screen.queryByTestId("overview-editors")).toBeNull();
      expect(refresh).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1500));
      expect(refresh).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("posts a comment on a field with no lesson", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);
    jest.mocked(getOrOpenReview).mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 7, round: 1, key: "k", state: "open" },
    } as never);
    jest.mocked(addComment).mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 30 },
    } as never);
    await mount();

    jest.useFakeTimers();
    try {
      const text = screen
        .getByTestId("overview-review-overview")
        .querySelector("p")!.firstChild!;
      const range = new Range();
      range.setStart(text, 0);
      range.setEnd(text, 4);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));
    } finally {
      jest.useRealTimers();
    }

    // A selection made without a drag offers the Comment button
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Comment on the selected text" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Comment on “This”" });
    await user.type(within(dialog).getByRole("textbox"), "Say which loops.");
    await user.click(within(dialog).getByRole("button", { name: "Comment" }));

    expect(addComment).toHaveBeenCalledWith({
      reviewId: 7,
      lessonId: null,
      field: "overview",
      anchor: expect.objectContaining({
        field: "overview",
        quote: "This",
      }),
      body: "Say which loops.",
    });
  });

  describe("the title and whole sections", () => {
    const section = (id: number, field: string): ReviewComment =>
      ({
        id,
        field,
        anchor: { v: 1, field },
        body: "About the section",
        resolvedAt: null,
      }) as ReviewComment;

    const withComments = (comments: ReviewComment[]) =>
      jest.mocked(getMyReview).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...review, comments },
      } as never);

    it("draws a comment on the title's words", async () => {
      withComments([quote(1, "name", "Loops")]);
      await mount();

      expect(mark("name", 1)).toBe("Loops");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Loops",
      );
    });

    it("tags a whole-section comment on its heading, and counts it", async () => {
      withComments([
        quote(1, "overview", "while loops"),
        section(2, "nextSteps"),
      ]);
      await mount();

      const nextSteps = screen.getByTestId("overview-section-nextSteps");
      expect(
        within(nextSteps).getByRole("button", {
          name: "Comment 2, pending: Section · “Next Steps”",
        }),
      ).toBeInTheDocument();
      // No mark in any text, and not listed as outdated
      expect(document.querySelector('[data-anchor-id="comment-2"]')).toBeNull();
      expect(screen.getByTestId("review-comment-strip")).toHaveTextContent(
        "2 comments on the Overview2 pending",
      );
    });

    it("stacks the text's tags below the section's own", async () => {
      const tagTop = (name: string) =>
        parseFloat(screen.getByRole("button", { name }).style.top);
      withComments([quote(1, "overview", "while loops")]);
      await mount();
      const alone = tagTop("Comment 1, pending: “while loops”");
      cleanup();

      withComments([
        quote(1, "overview", "while loops"),
        section(2, "overview"),
      ]);
      await mount();
      const heading = tagTop("Comment 2, pending: Section · “Overview”");
      const words = tagTop("Comment 1, pending: “while loops”");

      expect(words).toBeGreaterThan(alone);
      expect(words).toBeGreaterThanOrEqual(heading + 30);
    });

    it("opens a whole-section comment from its tag", async () => {
      const user = userEvent.setup();
      withComments([section(2, "funFact")]);
      await mount();

      await user.click(
        screen.getByRole("button", {
          name: "Comment 1, pending: Section · “Fun Fact”",
        }),
      );

      const card = screen.getByRole("dialog", { name: "Comment 1" });
      expect(card).toHaveTextContent("Section · “Fun Fact”");
      expect(card).toHaveTextContent("About the section");
    });

    it("comments on a whole section from its heading", async () => {
      const user = userEvent.setup();
      jest.mocked(addComment).mockResolvedValue({
        ok: true,
        error: null,
        data: { id: 30 },
      } as never);
      await mount();

      await user.click(screen.getByRole("heading", { name: "Next Steps" }));
      const dialog = screen.getByRole("dialog", {
        name: "Comment on the Next Steps section",
      });
      expect(within(dialog).getByText("4")).toBeInTheDocument();
      await user.type(
        within(dialog).getByRole("textbox"),
        "Link the follow-up droplet.",
      );
      await user.click(within(dialog).getByRole("button", { name: "Comment" }));

      expect(addComment).toHaveBeenCalledWith({
        reviewId: 7,
        lessonId: null,
        field: "nextSteps",
        anchor: { v: 1, field: "nextSteps" },
        body: "Link the follow-up droplet.",
      });
    });

    it("stops on each heading with the keyboard", async () => {
      const user = userEvent.setup();
      withComments([]);
      await mount();

      await user.click(
        screen.getByRole("button", { name: "Comment with the keyboard" }),
      );
      // The title, then the description, then the first section's heading
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(
        screen.getByText(
          "Section: Author(s). Press Enter to comment on the whole section.",
        ),
      ).toBeInTheDocument();

      await user.keyboard("{Enter}");
      expect(
        screen.getByRole("dialog", {
          name: "Comment on the Author(s) section",
        }),
      ).toBeInTheDocument();
    });
  });
});

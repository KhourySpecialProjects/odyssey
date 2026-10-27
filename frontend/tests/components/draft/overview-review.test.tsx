import { act, render, screen, within } from "@testing-library/react";
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
  field: "description" | "overview" | "objective",
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
});

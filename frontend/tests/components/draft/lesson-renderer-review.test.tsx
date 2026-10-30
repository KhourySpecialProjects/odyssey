import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import {
  ReviewFocusProvider,
  useReviewFocus,
} from "@/components/draft/review/review-focus-context";
import { mockAiFinding } from "@/testing/mocks/reviewsMock";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { getMyReview } from "@/lib/requests/reviews";

jest.mock("@/components/ui/tiptap/lesson-name-input", () => ({
  LessonNameInput: () => <div data-testid="lesson-name-input" />,
}));
jest.mock("@/components/draft/lesson/block_list", () => ({
  __esModule: true,
  default: () => <div data-testid="block-list" />,
}));
jest.mock("@/components/draft/lesson/delete-lesson", () => ({
  DeleteLessonButton: () => <button type="button">Delete Lesson</button>,
}));
jest.mock("@/components/draft/lesson/blocknote-editor", () => ({
  BlockNoteEditor: ({ anchors }: { anchors?: { id: string }[] }) => (
    <div
      data-testid="blocknote-editor"
      data-anchors={(anchors ?? []).map((a) => a.id).join(",")}
    />
  ),
}));
jest.mock("@/lib/pyodide/pyodide-context", () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/lib/requests/lesson", () => ({
  updateLesson: jest.fn().mockResolvedValue({ ok: true }),
  deleteLesson: jest.fn(),
  revalidateLesson: jest.fn().mockResolvedValue(undefined),
  getLatestLessonContent: jest.fn(),
}));
jest.mock("@/lib/requests/droplet", () => ({ getDropletBySlug: jest.fn() }));
jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const startEditing = jest.fn();
const stopEditing = jest.fn();
const mockUseEditingLock = jest.fn();
jest.mock("@/hooks/useEditingLock", () => ({
  useEditingLock: (...args: unknown[]) => mockUseEditingLock(...args),
}));

const lockState = (over: Record<string, unknown> = {}) => ({
  isLocked: false,
  isOwnLock: false,
  lockedBy: null,
  isLoading: false,
  error: null,
  inReview: true,
  isReviewer: true,
  reviewEnded: false,
  startEditing,
  stopEditing,
  markFrozen: jest.fn(),
  ...over,
});

const lesson = {
  id: 1,
  name: "Loops",
  slug: "loops",
  type: "standard",
  droplets: [],
  notes: "",
  orderIndex: 1,
  blocksVersion: "v2" as const,
  blocksV2: [
    {
      id: "b1",
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: "A loop repeats.", styles: {} }],
      children: [],
    },
  ],
  blocks: [],
};

const anchor = { v: 1 as const, field: "blocks" as const, blockId: "b1" };
const myReview = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "open",
  comments: [
    { id: 1, field: "blocks", anchor, body: "a", lesson: { id: 1 } },
    {
      id: 2,
      field: "blocks",
      anchor,
      body: "b",
      lesson: { id: 1 },
      resolvedAt: "2026-10-27T12:00:00Z",
    },
    { id: 3, field: "blocks", anchor, body: "c", lesson: { id: 2 } },
    {
      id: 4,
      field: "blocks",
      anchor: { v: 1, field: "blocks", blockId: "deleted-block" },
      body: "This paragraph is unclear",
      lesson: { id: 1 },
    },
  ],
};

/** Renders, then lets the comment load settle */
async function renderLesson() {
  const view = render(
    <LessonRenderer lesson={lesson} dropletSlug="d" dropletId={3} />,
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEditingLock.mockReturnValue(lockState());
  jest
    .mocked(getMyReview)
    .mockResolvedValue({ ok: true, error: null, data: myReview } as never);
});

describe("who sees the review bar", () => {
  it("a reviewer of a lesson in review, in Comment mode by default", async () => {
    await renderLesson();

    expect(screen.getByRole("button", { name: "Comment" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await waitFor(() => expect(getMyReview).toHaveBeenCalledWith(3));
  });

  it("not the frozen creator, who never loads review comments", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isReviewer: false }));
    await renderLesson();

    expect(screen.queryByRole("group", { name: "Review mode" })).toBeNull();
    expect(getMyReview).not.toHaveBeenCalled();
  });

  it("nobody when the lesson isn't in review", async () => {
    mockUseEditingLock.mockReturnValue(
      lockState({ inReview: false, isReviewer: false, isOwnLock: true }),
    );
    await renderLesson();

    expect(screen.queryByRole("group", { name: "Review mode" })).toBeNull();
    expect(getMyReview).not.toHaveBeenCalled();
  });

  it("nobody once the review has ended", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ reviewEnded: true }));
    await renderLesson();

    expect(screen.queryByRole("group", { name: "Review mode" })).toBeNull();
  });
});

describe("the three modes", () => {
  it("Read hides the comment strip and Comment brings it back", async () => {
    const user = userEvent.setup();
    await renderLesson();
    expect(await screen.findByTestId("review-comment-strip")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(screen.queryByTestId("review-comment-strip")).toBeNull();
    expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Comment" }));
    expect(screen.getByTestId("review-comment-strip")).toBeVisible();
  });

  it("Edit takes the lock", async () => {
    const user = userEvent.setup();
    await renderLesson();

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(startEditing).toHaveBeenCalled();
  });

  it("while editing, offers Stop editing and hides the toggle and the strip", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isOwnLock: true }));
    await renderLesson();

    expect(
      screen.getByRole("button", { name: "Stop editing" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Review mode" })).toBeNull();
    expect(screen.queryByTestId("review-comment-strip")).toBeNull();
  });

  it("disables Edit while a takeover is loading the latest version", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isRefreshing: true }));
    await renderLesson();

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  });
});

describe("the comment strip", () => {
  it("counts this lesson's comments and the pending ones", async () => {
    await renderLesson();

    expect(await screen.findByTestId("review-comment-strip")).toHaveTextContent(
      "3 comments on this lesson2 pending · sent when you request changes",
    );
  });

  it("says how to comment before the reviewer has made any", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);
    await renderLesson();

    await waitFor(() =>
      expect(screen.getByTestId("review-comment-strip")).toHaveTextContent(
        /^Comment modeClick anywhere in the text to comment right there, or drag across words to comment on them\./,
      ),
    );
  });

  it("says how many were carried over and marked addressed (ODY-807)", async () => {
    const from = { id: 100, review: { round: 1 } };
    jest.mocked(getMyReview).mockResolvedValue({
      ok: true,
      error: null,
      data: {
        ...myReview,
        round: 2,
        comments: [
          { ...myReview.comments[0], carriedFrom: from },
          {
            ...myReview.comments[3],
            carriedFrom: from,
            addressedAt: "2026-10-28T12:00:00Z",
          },
        ],
      },
    } as never);
    await renderLesson();

    const strip = await screen.findByTestId("review-comment-strip");
    expect(strip).toHaveTextContent("2 carried over from round 1");
    expect(strip).toHaveTextContent("1 marked addressed by the creator");
  });

  it("says when the comments couldn't load", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue({ ok: false, error: "failed", data: null } as never);
    await renderLesson();

    await waitFor(() =>
      expect(screen.getByTestId("review-comment-strip")).toHaveTextContent(
        "Couldn't load your comments",
      ),
    );
  });
});

describe("the drawing layer", () => {
  const drawnIds = () =>
    screen.getByTestId("blocknote-editor").getAttribute("data-anchors");

  it("draws this lesson's comments in Comment mode (resolved ones invisibly)", async () => {
    await renderLesson();

    await waitFor(() => expect(drawnIds()).toBe("comment-1,comment-2"));
  });

  it("draws nothing in Read mode", async () => {
    const user = userEvent.setup();
    await renderLesson();
    await waitFor(() => expect(drawnIds()).toBe("comment-1,comment-2"));

    await user.click(screen.getByRole("button", { name: "Read" }));

    expect(drawnIds()).toBe("");
  });

  it("draws nothing while the reviewer edits", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isOwnLock: true }));
    await renderLesson();

    expect(drawnIds()).toBe("");
  });

  it("lists a comment whose text is gone as outdated, not drawn", async () => {
    await renderLesson();

    const outdated = await screen.findByRole("region", {
      name: "Outdated comments",
    });
    expect(outdated).toHaveTextContent("This paragraph is unclear");
    expect(drawnIds()).not.toContain("comment-4");
  });
});

describe("finding marks (ODY-849)", () => {
  const found = (id: string, lessonId: number) =>
    mockAiFinding({
      id,
      lessonId,
      anchor: {
        v: 1,
        field: "blocks",
        blockId: "b1",
        start: 2,
        end: 6,
        quote: "loop",
        prefix: "A ",
        suffix: " repeats.",
      },
    });
  const items = [
    { finding: found("f1", 1), number: 1 },
    { finding: found("f2", 2), number: 2 },
  ];
  const Seed = () => {
    const set = useReviewFocus()?.setOpenDetail;
    useEffect(() => set?.({ band: "ok", findings: items }), [set]);
    return null;
  };
  const drawn = () =>
    screen.getByTestId("blocknote-editor").getAttribute("data-anchors");

  it.each([
    ["Comment mode draws this lesson's findings only", "", true],
    ["Read mode draws none", "Read", false],
  ])("%s", async (_name, click, shown) => {
    render(
      <ReviewFocusProvider active>
        <Seed />
        <LessonRenderer lesson={lesson} dropletSlug="d" dropletId={3} />
      </ReviewFocusProvider>,
    );
    await act(async () => {});
    if (click)
      await userEvent.click(screen.getByRole("button", { name: click }));

    await waitFor(() =>
      expect(drawn()).toBe(shown ? "comment-1,comment-2,finding-f1" : ""),
    );
  });

  it("draws a finding in a Classic lesson's review text", async () => {
    const classic = {
      ...lesson,
      blocksVersion: "v1" as const,
      blocksV2: null,
      blocks: [
        {
          id: 9,
          __component: "droplets.generic" as const,
          content: "<p>A loop repeats.</p>",
        },
      ],
    };
    render(
      <ReviewFocusProvider active>
        <Seed />
        <LessonRenderer
          lesson={classic as never}
          dropletSlug="d"
          dropletId={3}
        />
      </ReviewFocusProvider>,
    );
    await act(async () => {});

    const view = screen.getByTestId("classic-review-view");
    expect(view.querySelectorAll(".anchor-badge")).toHaveLength(1);
    expect(
      view.querySelector(".review-finding:not(.anchor-badge)"),
    ).toHaveTextContent("loop");
  });

  it("draws none while the reviewer edits", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isOwnLock: true }));
    render(
      <ReviewFocusProvider active>
        <Seed />
        <LessonRenderer lesson={lesson} dropletSlug="d" dropletId={3} />
      </ReviewFocusProvider>,
    );
    await act(async () => {});

    expect(drawn()).toBe("");
  });
});

describe("a Classic lesson (Task 7)", () => {
  const classic = {
    ...lesson,
    blocksVersion: "v1" as const,
    blocksV2: null,
    blocks: [
      {
        id: 9,
        __component: "droplets.generic" as const,
        content: "<p>A loop repeats code.</p>",
      },
    ],
  };
  const renderClassic = async () => {
    render(
      <LessonRenderer
        lesson={classic as never}
        dropletSlug="d"
        dropletId={3}
      />,
    );
    await act(async () => {});
  };

  it("shows the read-only review text in Comment mode", async () => {
    await renderClassic();

    expect(screen.getByTestId("classic-review-view")).toHaveTextContent(
      "A loop repeats code.",
    );
    expect(screen.queryByTestId("block-list")).toBeNull();
  });

  it("goes back to the block editors in Read mode", async () => {
    const user = userEvent.setup();
    await renderClassic();

    await user.click(screen.getByRole("button", { name: "Read" }));

    expect(screen.queryByTestId("classic-review-view")).toBeNull();
    expect(screen.getByTestId("block-list")).toBeInTheDocument();
  });

  it("keeps the block editors inert after leaving Comment mode", async () => {
    const user = userEvent.setup();
    await renderClassic();

    await user.click(screen.getByRole("button", { name: "Read" }));

    expect(screen.getByTestId("block-list").closest("[inert]")).not.toBeNull();
  });
});

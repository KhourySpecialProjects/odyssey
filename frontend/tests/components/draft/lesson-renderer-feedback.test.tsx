import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { SentFeedbackProvider } from "@/components/draft/review/review-comments-context";
import { getMyReview, getReviewForDroplet } from "@/lib/requests/reviews";
import {
  markAddressed as markAddressedRequest,
  replyToComment,
} from "@/lib/requests/reviews";
import { updateLesson } from "@/lib/requests/lesson";
import { htmlContent } from "@/lib/anchors/content";
import { classicLessonHtml } from "@/lib/review-classic";
import type { Block } from "@/types";

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

// The editor as the lesson sees it: what it's told to draw, and a way for the
// test to send its live content
type EditorProps = {
  anchors?: { id: string }[];
  anchorsFoundIn?: unknown;
  editable?: boolean;
  onContent?: (content: unknown[], doc: unknown) => void;
};
let editorProps: EditorProps = {};
jest.mock("@/components/draft/lesson/blocknote-editor", () => ({
  BlockNoteEditor: (props: EditorProps) => {
    editorProps = props;
    return (
      <div
        data-testid="blocknote-editor"
        data-anchors={(props.anchors ?? []).map((a) => a.id).join(",")}
      />
    );
  },
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
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
  replyToComment: jest.fn(),
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

const mockUseEditingLock = jest.fn();
jest.mock("@/hooks/useEditingLock", () => ({
  useEditingLock: (...args: unknown[]) => mockUseEditingLock(...args),
}));

// The creator, out of review, holding the lock
const lockState = (over: Record<string, unknown> = {}) => ({
  isLocked: true,
  isOwnLock: true,
  lockedBy: null,
  isLoading: false,
  error: null,
  inReview: false,
  isReviewer: false,
  reviewEnded: false,
  startEditing: jest.fn(),
  stopEditing: jest.fn(),
  markFrozen: jest.fn(),
  ...over,
});

const paragraph = (id: string, text: string) => ({
  id,
  type: "paragraph",
  props: {},
  content: [{ type: "text", text, styles: {} }],
  children: [],
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
    paragraph("b1", "A loop repeats a block of code."),
    paragraph("b2", "Use a for loop to count."),
  ],
  blocks: [],
};

// An anchor on `quote` in `text`, with the context createAnchor keeps
const words = (blockId: string, text: string, quote: string) => {
  const start = text.indexOf(quote);
  const end = start + quote.length;
  return {
    v: 1 as const,
    field: "blocks" as const,
    blockId,
    start,
    end,
    quote,
    prefix: text.slice(Math.max(0, start - 30), start),
    suffix: text.slice(end, end + 30),
  };
};

const sent = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "sent",
  sentAt: "2026-10-28T15:04:00.000Z",
  reviewer: { id: 9, firstName: "Nadia", lastName: "Reviewer" },
  comments: [
    {
      id: 1,
      field: "blocks",
      anchor: words("b1", "A loop repeats a block of code.", "repeats"),
      body: "Say how many times.",
      lesson: { id: 1 },
    },
    {
      id: 2,
      field: "blocks",
      anchor: words("b2", "Use a for loop to count.", "for loop"),
      body: "Show the syntax.",
      lesson: { id: 1 },
    },
    {
      id: 3,
      field: "blocks",
      anchor: words("x1", "Somewhere elsewhere.", "elsewhere"),
      body: "Another lesson's.",
      lesson: { id: 2 },
    },
  ],
};

async function renderLesson(
  shown: typeof lesson | typeof classic = lesson,
  isAuthor = true,
) {
  const view = render(
    <SentFeedbackProvider dropletId={3} enabled isAuthor={isAuthor}>
      <LessonRenderer lesson={shown} dropletSlug="d" dropletId={3} />
    </SentFeedbackProvider>,
  );
  await act(async () => {});
  return view;
}

const drawn = () =>
  screen.getByTestId("blocknote-editor").getAttribute("data-anchors");

beforeEach(() => {
  jest.clearAllMocks();
  editorProps = {};
  mockUseEditingLock.mockReturnValue(lockState());
  jest
    .mocked(getReviewForDroplet)
    .mockResolvedValue({ ok: true, error: null, data: sent } as never);
});

describe("the creator's view of sent feedback (ODY-807)", () => {
  it("marks this lesson's sent comments in the editor they edit in", async () => {
    await renderLesson();

    expect(getReviewForDroplet).toHaveBeenCalledWith(3);
    expect(drawn()).toBe("comment-1,comment-2");
    expect(editorProps.editable).toBe(true);
    const strip = screen.getByRole("region", { name: "Reviewer feedback" });
    expect(strip).toHaveTextContent(
      "2 comments from Nadia Reviewer on this lesson",
    );
    expect(strip).toHaveTextContent("Round 1 · sent");
  });

  it("shows nothing of an open review, which the server never sends an author", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);

    await renderLesson();

    expect(drawn()).toBe("");
    expect(
      screen.queryByRole("region", { name: "Reviewer feedback" }),
    ).not.toBeInTheDocument();
  });

  it("never shows the reviewer's Comment, Read and Edit bar, or loads their review", async () => {
    await renderLesson();

    expect(
      screen.queryByRole("button", { name: "Comment" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-bar")).not.toBeInTheDocument();
    expect(getMyReview).not.toHaveBeenCalled();
  });

  it("moves a comment to Outdated as soon as its sentence is edited away, before any save", async () => {
    await renderLesson();
    const doc = { version: 2 };

    act(() => {
      editorProps.onContent?.(
        [paragraph("b1", "Loops come later."), lesson.blocksV2[1]],
        doc,
      );
    });

    expect(drawn()).toBe("comment-2");
    // Found in the text the editor holds now
    expect(editorProps.anchorsFoundIn).toBe(doc);
    const outdated = screen.getByRole("region", { name: "Outdated comments" });
    expect(within(outdated).getByText("repeats")).toBeInTheDocument();
    expect(outdated).toHaveTextContent("Say how many times.");
    expect(updateLesson).not.toHaveBeenCalled();
  });

  it("finds a comment again where the text moved", async () => {
    await renderLesson();

    act(() => {
      editorProps.onContent?.(
        [
          paragraph("b0", "A new first paragraph."),
          paragraph("b1", "So, a loop repeats a block of code."),
          lesson.blocksV2[1],
        ],
        { version: 3 },
      );
    });

    expect(drawn()).toBe("comment-1,comment-2");
    expect(
      screen.queryByRole("region", { name: "Outdated comments" }),
    ).not.toBeInTheDocument();
  });

  it("still shows the feedback, read-only, while the draft is back in review", async () => {
    mockUseEditingLock.mockReturnValue(
      lockState({ inReview: true, isOwnLock: false, isLocked: false }),
    );

    await renderLesson();

    expect(drawn()).toBe("comment-1,comment-2");
    expect(editorProps.editable).toBe(false);
    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("The reviewer is reading your changes.");
  });
});

describe("an author while the lock loads (ODY-881)", () => {
  it("still shows the feedback", async () => {
    mockUseEditingLock.mockReturnValue(lockState({ isLoading: true }));
    await renderLesson();

    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toBeInTheDocument();
  });
});

describe("a non-author reviewer reading the sent feedback (ODY-881)", () => {
  it("marks the comments and words the strip for a reviewer", async () => {
    await renderLesson(lesson, false);

    expect(drawn()).toBe("comment-1,comment-2");
    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("its replies");
  });

  it("opens a Classic comment with Reply and no Mark addressed", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: classicSent } as never);
    await renderLesson(classic, false);

    await userEvent.click(classicMarks("comment-1")[0] as HTMLElement);

    const card = screen.getByRole("dialog", { name: "Comment 1" });
    expect(within(card).getByRole("button", { name: "Reply" })).toBeVisible();
    expect(
      within(card).queryByRole("button", { name: "Mark addressed" }),
    ).not.toBeInTheDocument();
  });
});

// A Classic-editor lesson: its comments are quotes in the whole lesson's text
const classicBlocks: Block[] = [
  {
    __component: "droplets.generic",
    content: "<p>A loop repeats a block of code.</p>",
  },
  {
    __component: "droplets.generic",
    content: "<p>Use a for loop to count.</p>",
  },
];
const classic = {
  ...lesson,
  blocksVersion: "v1" as const,
  blocksV2: undefined,
  blocks: classicBlocks,
};
const classicText = htmlContent(classicLessonHtml(classicBlocks))[0].text;
const quoted = (quote: string, text = classicText) => {
  const { blockId: _, ...anchor } = words("", text, quote);
  return anchor;
};
const classicSent = {
  ...sent,
  comments: [
    {
      id: 1,
      field: "blocks",
      anchor: quoted("repeats"),
      body: "Say how many times.",
      lesson: { id: 1 },
    },
    {
      id: 2,
      field: "blocks",
      anchor: quoted("while", "Then a while loop stops on a condition."),
      body: "Explain the condition.",
      lesson: { id: 1 },
    },
  ],
};

const classicMarks = (id: string) =>
  screen
    .getByTestId("classic-review-view")
    .querySelectorAll(`[data-anchor-id="${id}"]`);

describe("the creator's view of sent feedback on a Classic lesson (ODY-880)", () => {
  beforeEach(() => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: classicSent } as never);
    jest
      .mocked(markAddressedRequest)
      .mockResolvedValue({ ok: true, error: null } as never);
  });

  it("opens on Feedback: the lesson's text with each current comment marked", async () => {
    await renderLesson(classic);

    expect(screen.queryByTestId("block-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("classic-review-view")).toHaveTextContent(
      "A loop repeats a block of code.",
    );
    expect(classicMarks("comment-1").length).toBeGreaterThan(0);
    expect(classicMarks("comment-1")[0]).toHaveTextContent("repeats");
    expect(screen.getByRole("button", { name: "Feedback" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("Click a highlight or its number to read a comment");
  });

  it("lists a comment whose text is gone as outdated, and doesn't mark it", async () => {
    await renderLesson(classic);

    expect(classicMarks("comment-2")).toHaveLength(0);
    const outdated = screen.getByRole("region", { name: "Outdated comments" });
    expect(outdated).toHaveTextContent("Explain the condition.");
    expect(outdated).not.toHaveTextContent("Say how many times.");
  });

  it("opens a comment's card from its mark, where the creator marks it addressed", async () => {
    await renderLesson(classic);

    await userEvent.click(classicMarks("comment-1")[0] as HTMLElement);

    const card = screen.getByRole("dialog", { name: "Comment 1" });
    expect(card).toHaveTextContent("Say how many times.");
    await userEvent.click(
      within(card).getByRole("button", { name: "Mark addressed" }),
    );
    expect(markAddressedRequest).toHaveBeenCalledWith(1, true);
  });

  it("replies from a Classic comment's card, also while the draft is back in review", async () => {
    mockUseEditingLock.mockReturnValue(
      lockState({ inReview: true, isOwnLock: false, isLocked: false }),
    );
    jest.mocked(replyToComment).mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 90, body: "Added it", parent: { id: 1 } },
    } as never);
    await renderLesson(classic);

    await userEvent.click(classicMarks("comment-1")[0] as HTMLElement);
    const card = screen.getByRole("dialog", { name: "Comment 1" });
    await userEvent.click(within(card).getByRole("button", { name: "Reply" }));
    await userEvent.type(
      within(card).getByRole("textbox", { name: "Write a reply" }),
      "Added it",
    );
    await userEvent.click(within(card).getByRole("button", { name: "Reply" }));

    expect(replyToComment).toHaveBeenCalledWith(1, "Added it");
    expect(await within(card).findByText("Added it")).toBeInTheDocument();
  });

  it("switches to Edit for the block editors, and back to Feedback", async () => {
    await renderLesson(classic);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByTestId("block-list")).toBeInTheDocument();
    expect(screen.queryByTestId("classic-review-view")).not.toBeInTheDocument();
    const strip = screen.getByRole("region", { name: "Reviewer feedback" });
    expect(strip).toHaveTextContent("2 comments from Nadia Reviewer");
    expect(strip).not.toHaveTextContent("Click a highlight");
    // The outdated ones stay listed while the creator edits
    expect(
      screen.getByRole("region", { name: "Outdated comments" }),
    ).toHaveTextContent("Explain the condition.");

    await userEvent.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.queryByTestId("block-list")).not.toBeInTheDocument();
    expect(classicMarks("comment-1").length).toBeGreaterThan(0);
  });

  it("shows only Feedback, with no Mark addressed, while the draft is back in review", async () => {
    mockUseEditingLock.mockReturnValue(
      lockState({ inReview: true, isOwnLock: false, isLocked: false }),
    );

    await renderLesson(classic);

    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-list")).not.toBeInTheDocument();
    await userEvent.click(classicMarks("comment-1")[0] as HTMLElement);
    const card = screen.getByRole("dialog", { name: "Comment 1" });
    expect(
      within(card).queryByRole("button", { name: "Mark addressed" }),
    ).not.toBeInTheDocument();
  });

  it("shows only Feedback while someone else holds the lesson's lock", async () => {
    mockUseEditingLock.mockReturnValue(
      lockState({
        isOwnLock: false,
        lockedBy: { id: 4, firstName: "Sam", lastName: "Author" },
      }),
    );

    await renderLesson(classic);

    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(classicMarks("comment-1").length).toBeGreaterThan(0);
  });

  it("shows the block editors, with no switch, when the lesson has no feedback", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);

    await renderLesson(classic);

    expect(screen.getByTestId("block-list")).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Lesson view" }),
    ).not.toBeInTheDocument();
  });
});

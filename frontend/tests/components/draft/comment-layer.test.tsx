import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CommentLayer } from "@/components/draft/review/comment-layer";
import { SELECTION_DELAY_MS } from "@/lib/selection";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

// jsdom lays nothing out. jest.setup's document.createRange stubs each
// range's rect, so ranges here are made with `new Range()`.
beforeAll(() => {
  Range.prototype.getBoundingClientRect = () =>
    ({
      top: 100,
      bottom: 120,
      left: 40,
      right: 100,
      width: 60,
      height: 20,
    }) as DOMRect;
});

/** Two blocks laid out like BlockNote's editor DOM, with comment 1's mark */
const Editor = () => (
  <div className="bn-editor">
    <div data-node-type="blockContainer" data-id="b1">
      <div className="bn-block-content">
        <p className="bn-inline-content">
          A loop repeats a block of code.{" "}
          <span data-anchor-id="comment-1" className="review-mark">
            Marked
          </span>
        </p>
      </div>
    </div>
    <div data-node-type="blockContainer" data-id="b2">
      <div className="bn-block-content">
        <p className="bn-inline-content">Loops end when a condition fails.</p>
      </div>
    </div>
  </div>
);

const onPost = jest.fn();
const onDraftChange = jest.fn();
const onEdit = jest.fn();
const onDelete = jest.fn();
const onResolve = jest.fn();
const onLitChange = jest.fn();

const wordsComment = {
  id: 1,
  field: "blocks" as const,
  anchor: {
    v: 1 as const,
    field: "blocks" as const,
    blockId: "b1",
    start: 2,
    end: 6,
    quote: "loop",
    prefix: "A ",
    suffix: " repeats",
  },
  body: "Which loop?",
  resolvedAt: null,
};
const blockComment = {
  id: 2,
  field: "blocks" as const,
  anchor: { v: 1 as const, field: "blocks" as const, blockId: "b2" },
  body: "Shorten this.",
  resolvedAt: "2026-10-27T12:00:00Z",
};

function mount(
  enabled = true,
  over: Partial<React.ComponentProps<typeof CommentLayer>> = {},
) {
  return render(
    <CommentLayer
      enabled={enabled}
      field="blocks"
      comments={[]}
      numbers={new Map()}
      outdatedIds={new Set()}
      blockFor={(id) =>
        id === "b2"
          ? { type: "paragraph", text: "Loops end when a condition fails." }
          : undefined
      }
      canChange
      onPost={onPost}
      onEdit={onEdit}
      onDelete={onDelete}
      onResolve={onResolve}
      onDraftChange={onDraftChange}
      litMarkId={null}
      onLitChange={onLitChange}
      {...over}
    >
      <Editor />
    </CommentLayer>,
  );
}

/** Selects text in a block the way a mouse or Shift + arrows would */
function selectWords(blockId: string, from: number, to: number) {
  const text = document.querySelector(
    `[data-id="${blockId}"] .bn-inline-content`,
  )!.firstChild!;
  const range = new Range();
  range.setStart(text, from);
  range.setEnd(text, to);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));
}

beforeEach(() => {
  jest.clearAllMocks();
  onPost.mockResolvedValue({ ok: true });
});

afterEach(() => window.getSelection()?.removeAllRanges());

describe("a whole-block comment", () => {
  it("gives every block a bar that opens the comment box", async () => {
    const user = userEvent.setup();
    mount();

    const bars = screen.getAllByRole("button", {
      name: /^Comment on this paragraph:/,
    });
    expect(bars).toHaveLength(2);
    await user.click(bars[1]);

    const dialog = screen.getByRole("dialog", {
      name: "Comment on this paragraph",
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Whole paragraph")).toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith({
      v: 1,
      field: "blocks",
      blockId: "b2",
    });
    expect(screen.getByRole("textbox", { name: "Your comment" })).toHaveFocus();
  });

  it("posts the block's anchor and the text, then says it's saved", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      screen.getAllByRole("button", { name: /^Comment on this paragraph:/ })[0],
    );

    await user.type(screen.getByRole("textbox"), "Say what a block is.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(onPost).toHaveBeenCalledWith(
      { v: 1, field: "blocks", blockId: "b1" },
      "Say what a block is.",
    );
    expect(toast.success).toHaveBeenCalledWith("Comment saved");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
  });
});

describe("a comment on a few words", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("opens from a selection, quoting it", () => {
    mount();

    selectWords("b1", 2, 6);

    expect(
      screen.getByRole("dialog", { name: "Comment on “loop”" }),
    ).toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith({
      v: 1,
      field: "blocks",
      blockId: "b1",
      start: 2,
      end: 6,
      quote: "loop",
      prefix: "A ",
      suffix: expect.stringMatching(/^ repeats a block of code\./),
    });
  });

  it("opens from a keyboard-made selection too, through the same selectionchange path", () => {
    mount();

    // Shift + arrow keys only change the selection; nothing else fires
    selectWords("b2", 0, 5);

    expect(
      screen.getByRole("dialog", { name: "Comment on “Loops”" }),
    ).toBeInTheDocument();
  });

  it("ignores a selection that spans two blocks", () => {
    mount();
    const first = document.querySelector(
      '[data-id="b1"] .bn-inline-content',
    )!.firstChild!;
    const second = document.querySelector(
      '[data-id="b2"] .bn-inline-content',
    )!.firstChild!;
    const range = new Range();
    range.setStart(first, 2);
    range.setEnd(second, 3);
    window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing while the layer is off (Read or Edit mode)", () => {
    mount(false);

    selectWords("b1", 2, 6);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^Comment on this paragraph/ }),
    ).toBeNull();
  });
});

describe("the comment box", () => {
  async function openOnBlock() {
    const user = userEvent.setup();
    mount();
    const bar = screen.getAllByRole("button", {
      name: /^Comment on this paragraph:/,
    })[0];
    await user.click(bar);
    return { user, bar };
  }

  it("can't post an empty comment", async () => {
    await openOnBlock();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("keeps the text and says why when the save fails", async () => {
    onPost.mockResolvedValue({ ok: false, error: "review_closed" });
    const { user } = await openOnBlock();

    await user.type(screen.getByRole("textbox"), "Unclear.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This review has been sent",
    );
    expect(screen.getByRole("textbox")).toHaveValue("Unclear.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("posts with Ctrl+Enter", async () => {
    const { user } = await openOnBlock();

    await user.type(screen.getByRole("textbox"), "Fine.");
    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() => expect(onPost).toHaveBeenCalled());
  });

  it("cancels with Esc and gives focus back to the bar", async () => {
    const { user, bar } = await openOnBlock();

    await user.type(screen.getByRole("textbox"), "Never mind");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onPost).not.toHaveBeenCalled();
    expect(bar).toHaveFocus();
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
  });

  it("cancels with the Cancel button", async () => {
    const { user } = await openOnBlock();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("tags and the comment card (Task 6)", () => {
  const withComments = (over = {}) =>
    mount(true, {
      comments: [wordsComment, blockComment],
      numbers: new Map([[1, 1]]),
      ...over,
    });

  beforeEach(() => {
    onEdit.mockResolvedValue({ ok: true });
    onDelete.mockResolvedValue({ ok: true });
    onResolve.mockResolvedValue({ ok: true });
  });

  it("gives each comment a tag with its number and what it's about", () => {
    withComments();

    expect(
      screen.getByRole("button", { name: "Comment 1: “loop”" }),
    ).toHaveTextContent("1“loop”");
    // Resolved: no number, placed by its block, named by the block
    expect(
      screen.getByRole("button", {
        name: "Resolved comment: Paragraph · “Loops end when a condition fails.”",
      }),
    ).toBeInTheDocument();
  });

  it("puts the tags in reading order", () => {
    withComments();

    expect(screen.getAllByTestId("comment-tag")).toHaveLength(2);
  });

  it("gives an outdated comment no tag", () => {
    withComments({ outdatedIds: new Set([1]) });

    expect(screen.getAllByTestId("comment-tag")).toHaveLength(1);
  });

  it("shows only the number where the margin is tight, and the words on hover or focus", () => {
    const width = window.innerWidth;
    window.innerWidth = 100;
    try {
      withComments();
      const snippet = screen
        .getByRole("button", { name: "Comment 1: “loop”" })
        .querySelector("span:last-child")!;
      expect(snippet).toHaveClass(
        "hidden",
        "group-hover:inline",
        "group-focus-visible:inline",
      );
    } finally {
      window.innerWidth = width;
    }
  });

  it("lights the mark when its tag is hovered or focused, and the tag when the mark is", async () => {
    const user = userEvent.setup();
    withComments();
    const tag = screen.getByRole("button", { name: "Comment 1: “loop”" });

    await user.hover(tag);
    expect(onLitChange).toHaveBeenLastCalledWith("comment-1");
    await user.unhover(tag);
    expect(onLitChange).toHaveBeenLastCalledWith(null);

    await user.hover(screen.getByText("Marked"));
    expect(onLitChange).toHaveBeenLastCalledWith("comment-1");
  });

  it("prefers an open words comment where marks nest", async () => {
    const user = userEvent.setup();
    const outer = { ...blockComment, id: 3, resolvedAt: null };
    render(
      <CommentLayer
        enabled
        field="blocks"
        comments={[outer, wordsComment]}
        numbers={
          new Map([
            [1, 1],
            [3, 2],
          ])
        }
        outdatedIds={new Set()}
        blockFor={() => undefined}
        canChange
        onPost={onPost}
        onEdit={onEdit}
        onDelete={onDelete}
        onResolve={onResolve}
        onDraftChange={onDraftChange}
        litMarkId={null}
        onLitChange={onLitChange}
      >
        {/* The editor put the whole-block mark innermost */}
        <p>
          <span data-anchor-id="comment-1">
            <span data-anchor-id="comment-3">loop</span>
          </span>
        </p>
      </CommentLayer>,
    );

    await user.hover(screen.getByText("loop"));
    expect(onLitChange).toHaveBeenLastCalledWith("comment-1");
    await user.click(screen.getByText("loop"));
    expect(
      screen.getByRole("dialog", { name: "Comment 1" }),
    ).toBeInTheDocument();
  });

  it("rings the tag of the lit mark", () => {
    withComments({ litMarkId: "comment-1" });

    expect(
      screen.getByRole("button", { name: "Comment 1: “loop”" }),
    ).toHaveClass("ring-2");
  });

  it("opens the card from a tag, and from the mark", async () => {
    const user = userEvent.setup();
    withComments();

    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));
    expect(screen.getByRole("dialog", { name: "Comment 1" })).toHaveTextContent(
      "Which loop?",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByText("Marked"));
    expect(
      screen.getByRole("dialog", { name: "Comment 1" }),
    ).toBeInTheDocument();
  });

  it("edits a comment from its card", async () => {
    const user = userEvent.setup();
    withComments();
    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByRole("textbox", { name: "Edit your comment" });
    await user.clear(box);
    await user.type(box, "Which kind of loop?");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onEdit).toHaveBeenCalledWith(1, "Which kind of loop?");
  });

  it("deletes a comment after confirming", async () => {
    const user = userEvent.setup();
    withComments();
    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves a comment, and reopens a resolved one", async () => {
    const user = userEvent.setup();
    withComments();

    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolve).toHaveBeenCalledWith(1, true);

    await user.click(
      screen.getByRole("button", { name: /^Resolved comment:/ }),
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(onResolve).toHaveBeenCalledWith(2, false);
  });

  it("says so when a change doesn't save, and stays open", async () => {
    onDelete.mockResolvedValue({ ok: false, error: "failed" });
    const user = userEvent.setup();
    withComments();
    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That didn't save",
    );
    expect(
      screen.getByRole("dialog", { name: "Comment 1" }),
    ).toBeInTheDocument();
  });

  it("offers no changes once the review is sent", async () => {
    const user = userEvent.setup();
    withComments({ canChange: false });
    await user.click(screen.getByRole("button", { name: "Comment 1: “loop”" }));

    for (const name of ["Edit", "Delete", "Resolve"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});

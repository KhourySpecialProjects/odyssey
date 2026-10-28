import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CommentLayer } from "@/components/draft/review/comment-layer";
import {
  CommentKeyboardButton,
  CommentKeyboardProvider,
} from "@/components/draft/review/comment-keyboard";
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
  Range.prototype.getClientRects = function () {
    return [this.getBoundingClientRect()] as unknown as DOMRectList;
  };
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
      {over.children ?? <Editor />}
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

/** Where the browser would put a caret for a click: a text node and offset */
function caretAt(blockId: string, offset: number) {
  const text = document.querySelector(
    `[data-id="${blockId}"] .bn-inline-content`,
  )!.firstChild!;
  (
    document as unknown as { caretPositionFromPoint: unknown }
  ).caretPositionFromPoint = () => ({ offsetNode: text, offset });
}

afterEach(() => {
  delete (document as unknown as { caretPositionFromPoint?: unknown })
    .caretPositionFromPoint;
});

const content = () => document.querySelector(".rc-commenting")!;

describe("a whole-block comment", () => {
  it("gives every block a bar that opens the comment box", async () => {
    const user = userEvent.setup();
    mount();

    const bars = screen.getAllByTestId("block-bar");
    expect(bars).toHaveLength(2);
    // The keyboard reaches blocks through "Comment with the keyboard"
    expect(bars[0]).toHaveAttribute("tabindex", "-1");
    await user.hover(bars[1]);
    expect(bars[1].firstChild).toHaveClass("scale-x-[2]");
    await user.click(bars[1]);

    expect(
      screen.getByRole("dialog", { name: "Comment on this paragraph" }),
    ).toBeInTheDocument();
    // Outlined by the layer, not marked in the text
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("textbox", { name: "Comment" })).toHaveFocus();
  });

  it("posts the block's anchor and the text, then says it's saved", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getAllByTestId("block-bar")[0]);

    await user.type(screen.getByRole("textbox"), "Say what a block is.");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    expect(onPost).toHaveBeenCalledWith(
      { v: 1, field: "blocks", blockId: "b1" },
      "Say what a block is.",
    );
    expect(toast.success).toHaveBeenCalledWith("Comment saved");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
  });

  it("takes the whole block on an Alt-click", () => {
    mount();
    caretAt("b2", 3);

    fireEvent.click(screen.getByText(/^Loops end/), { altKey: true });

    expect(
      screen.getByRole("dialog", { name: "Comment on this paragraph" }),
    ).toBeInTheDocument();
  });
});

describe("a block without text of its own (an image, code, a check-in)", () => {
  // Its caption is drawn by the block, not saved as its text
  const WithImage = () => (
    <div className="bn-editor">
      <div data-node-type="blockContainer" data-id="b1">
        <div className="bn-block-content">
          <p className="bn-inline-content">A loop repeats a block of code.</p>
        </div>
      </div>
      {/* Odyssey's blocks are drawn by React, inside a renderer */}
      <div data-node-type="blockContainer" data-id="pic">
        <div className="react-renderer node-image" contentEditable={false}>
          <div className="bn-block-content" data-content-type="image">
            <p>A diagram of a loop</p>
          </div>
        </div>
      </div>
    </div>
  );
  const mountWithImage = () =>
    mount(true, {
      children: <WithImage />,
      blockFor: (id) =>
        id === "pic" ? { type: "image", text: "" } : undefined,
    });
  const caption = () => screen.getByText("A diagram of a loop");

  it("gives it a bar, like any block", () => {
    mountWithImage();

    expect(
      screen
        .getAllByTestId("block-bar")
        .map((bar) => bar.getAttribute("data-block-id")),
    ).toEqual(["b1", "pic"]);
  });

  it("takes a click as a comment on the whole block", () => {
    mountWithImage();
    (
      document as unknown as { caretPositionFromPoint: unknown }
    ).caretPositionFromPoint = () => ({
      offsetNode: caption().firstChild,
      offset: 3,
    });

    fireEvent.click(caption());

    expect(
      screen.getByRole("dialog", { name: "Comment on this image" }),
    ).toBeInTheDocument();
  });

  it("takes a drag across its text as a comment on the whole block", () => {
    jest.useFakeTimers();
    try {
      mountWithImage();
      fireEvent.pointerDown(caption());
      const range = new Range();
      range.setStart(caption().firstChild!, 2);
      range.setEnd(caption().firstChild!, 9);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      fireEvent.pointerUp(document);
      act(() => jest.advanceTimersByTime(0));

      expect(
        screen.getByRole("dialog", { name: "Comment on this image" }),
      ).toBeInTheDocument();
      expect(toast.info).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("a comment at a spot (the caret)", () => {
  it("opens at the spot clicked, anchored to the letters beside it", () => {
    mount();
    // "A loop rep|eats"
    caretAt("b1", 10);

    fireEvent.click(screen.getByText(/^A loop repeats/));

    expect(
      screen.getByRole("dialog", { name: /^Comment at “A loop rep‸eats a/ }),
    ).toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith({
      v: 1,
      field: "blocks",
      blockId: "b1",
      start: 10,
      end: 14,
      quote: "eats",
      prefix: "A loop rep",
      suffix: expect.stringMatching(/^ a block of code\./),
      point: "before",
    });
  });

  it("draws the caret where the pointer is", () => {
    jest.useFakeTimers();
    try {
      mount();
      caretAt("b1", 10);

      fireEvent.pointerMove(screen.getByText(/^A loop repeats/), {
        clientX: 50,
        clientY: 110,
      });
      act(() => jest.advanceTimersByTime(20));

      expect(document.querySelector(".rc-caret")).toHaveClass("is-on");
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps a half-written comment when the text is clicked again", async () => {
    const user = userEvent.setup();
    mount();
    caretAt("b1", 10);
    fireEvent.click(screen.getByText(/^A loop repeats/));
    await user.type(screen.getByRole("textbox"), "Half a thought");

    caretAt("b2", 3);
    fireEvent.pointerDown(screen.getByText(/^Loops end/));
    fireEvent.click(screen.getByText(/^Loops end/));

    expect(screen.getByRole("textbox")).toHaveValue("Half a thought");
    expect(toast.info).toHaveBeenCalledWith(
      "Post or cancel this comment first.",
      { id: "comment-hold" },
    );
  });

  it("doesn't follow a link in the text", () => {
    render(
      <CommentLayer
        enabled
        field="overview"
        comments={[]}
        numbers={new Map()}
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
        <p>
          See <a href="https://example.com">the docs</a>
        </p>
      </CommentLayer>,
    );

    const click = createEvent.click(screen.getByText("the docs"));
    fireEvent(screen.getByText("the docs"), click);

    expect(click.defaultPrevented).toBe(true);
  });
});

describe("a comment on a few words", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("opens at once when the words are dragged across", () => {
    mount();
    fireEvent.pointerDown(screen.getByText(/^A loop repeats/));
    selectWords("b1", 2, 6);
    fireEvent.pointerUp(document);
    act(() => jest.runOnlyPendingTimers());

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

  it("offers a Comment button for a selection made another way", () => {
    mount();

    // Shift + arrow keys only change the selection; nothing else fires
    selectWords("b2", 0, 5);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Comment on the selected text" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Comment on “Loops”" }),
    ).toBeInTheDocument();
  });

  it("takes a selection across blocks (Round 2)", () => {
    mount();
    const first = document.querySelector(
      '[data-id="b1"] .bn-inline-content',
    )!.firstChild!;
    const second = document.querySelector(
      '[data-id="b2"] .bn-inline-content',
    )!.firstChild!;
    const range = new Range();
    range.setStart(first, 15);
    range.setEnd(second, 5);
    fireEvent.pointerDown(screen.getByText(/^A loop repeats/));
    window.getSelection()!.addRange(range);
    fireEvent.pointerUp(document);
    act(() => jest.runOnlyPendingTimers());

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      /^Comment on “a block of code\. Marked Loops”/,
    );
    expect(onDraftChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        blockId: "b1",
        endBlockId: "b2",
        start: 15,
        end: 5,
      }),
    );
  });

  it("does nothing while the layer is off (Read or Edit mode)", () => {
    mount(false);

    selectWords("b1", 2, 6);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("block-bar")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Comment on the selected text" }),
    ).toBeNull();
  });
});

describe("the comment box", () => {
  async function openOnBlock() {
    const user = userEvent.setup();
    mount();
    const bar = screen.getAllByTestId("block-bar")[0];
    await user.click(bar);
    return { user, bar };
  }

  it("says what the comment will be numbered, and can't post when empty", async () => {
    await openOnBlock();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "1Comment on this block",
    );
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    expect(
      screen.getByText(/only you see it until you request changes/),
    ).toBeInTheDocument();
  });

  it("keeps the text and says why when the save fails", async () => {
    onPost.mockResolvedValue({ ok: false, error: "review_closed" });
    const { user } = await openOnBlock();

    await user.type(screen.getByRole("textbox"), "Unclear.");
    await user.click(screen.getByRole("button", { name: "Comment" }));

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

describe("Comment with the keyboard", () => {
  function mountWithKeyboard() {
    render(
      <CommentKeyboardProvider>
        <CommentKeyboardButton />
        <CommentLayer
          enabled
          field="blocks"
          comments={[]}
          numbers={new Map()}
          outdatedIds={new Set()}
          blockFor={() => ({ type: "paragraph", text: "" })}
          canChange
          onPost={onPost}
          onEdit={onEdit}
          onDelete={onDelete}
          onResolve={onResolve}
          onDraftChange={onDraftChange}
          litMarkId={null}
          onLitChange={onLitChange}
        >
          <Editor />
        </CommentLayer>
      </CommentKeyboardProvider>,
    );
    return screen.getByRole("button", { name: "Comment with the keyboard" });
  }
  const live = () => document.querySelector('[aria-live="polite"]')!;

  it("chooses a block with the arrows and comments on it", async () => {
    const user = userEvent.setup();
    const button = mountWithKeyboard();

    await user.click(button);
    expect(live()).toHaveTextContent(/^Paragraph 1 of 2: A loop repeats/);
    await user.keyboard("{ArrowDown}");
    expect(live()).toHaveTextContent(/^Paragraph 2 of 2: Loops end/);
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("dialog", { name: "Comment on this paragraph" }),
    ).toBeInTheDocument();
  });

  it("moves a caret through a block's letters, and by word with Alt", async () => {
    const user = userEvent.setup();
    const button = mountWithKeyboard();

    await user.click(button);
    await user.keyboard("{ArrowRight}");
    expect(live()).toHaveTextContent("Before “A”, at the start");
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(live()).toHaveTextContent("After “A”, before “loop”");
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      /^Comment at “A l‸oop repeats/,
    );
  });

  it("takes several blocks with Shift", async () => {
    const user = userEvent.setup();
    const button = mountWithKeyboard();

    await user.click(button);
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(live()).toHaveTextContent("2 blocks");
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("dialog", { name: "Comment on these 2 blocks" }),
    ).toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
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
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
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
        .getByRole("button", { name: "Comment 1, pending: “loop”" })
        .querySelector("span:last-child")!;
      expect(snippet).toHaveClass(
        "hidden",
        "group-hover/tag:block",
        "group-focus-visible/tag:block",
      );
    } finally {
      window.innerWidth = width;
    }
  });

  it("lights the mark when its tag is hovered or focused, and the tag when the mark is", async () => {
    const user = userEvent.setup();
    withComments();
    const tag = screen.getByRole("button", {
      name: "Comment 1, pending: “loop”",
    });

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

  it("lights the tag of the lit mark", () => {
    withComments({ litMarkId: "comment-1" });

    expect(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    ).toHaveClass("-translate-x-0.5", "border-solid");
  });

  it("shows a spot comment's tag with the caret between the words", () => {
    const spot = {
      ...wordsComment,
      anchor: { ...wordsComment.anchor, point: "after" as const },
    };
    withComments({ comments: [spot] });

    expect(
      screen.getByRole("button", {
        name: "Comment 1, pending: “A loop‸ repeats”",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector(".rc-caretmark")).not.toBeNull();
  });

  it("shows who wrote a comment and that it's private, in its card", async () => {
    const user = userEvent.setup();
    withComments({
      comments: [
        {
          ...wordsComment,
          author: { firstName: "Eli", lastName: "Editor" } as never,
        },
      ],
    });

    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );

    const card = screen.getByRole("dialog", { name: "Comment 1" });
    expect(card).toHaveTextContent("Pending");
    expect(card).toHaveTextContent("Eli Editor");
    expect(card).toHaveTextContent(
      "Only you can see this until you request changes.",
    );
    await user.click(screen.getByRole("button", { name: "Close comment" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the card from a tag, and from the mark", async () => {
    const user = userEvent.setup();
    withComments();

    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );
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

  it.each([
    ["its mark", () => screen.getByText("Marked")],
    [
      "its tag",
      () => screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    ],
  ])(
    "keeps a half-written comment when another comment's %s is clicked",
    async (_name, target) => {
      const user = userEvent.setup();
      withComments();
      caretAt("b2", 3);
      fireEvent.click(screen.getByText(/^Loops end/));
      await user.type(screen.getByRole("textbox"), "Half a thought");

      fireEvent.pointerDown(target());
      fireEvent.click(target());

      expect(screen.getByRole("textbox")).toHaveValue("Half a thought");
      expect(screen.queryByRole("dialog", { name: "Comment 1" })).toBeNull();
      expect(toast.info).toHaveBeenCalledWith(
        "Post or cancel this comment first.",
        { id: "comment-hold" },
      );
    },
  );

  it("edits a comment from its card", async () => {
    const user = userEvent.setup();
    withComments();
    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );

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
    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves a comment, and reopens a resolved one", async () => {
    const user = userEvent.setup();
    withComments();

    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolve).toHaveBeenCalledWith(1, true);

    await user.click(
      screen.getByRole("button", { name: /^Resolved comment:/ }),
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(onResolve).toHaveBeenCalledWith(2, false);
  });

  it("doesn't close a card opened while a Resolve was still saving", async () => {
    let finish: (value: { ok: true }) => void = () => {};
    onResolve.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    withComments({
      comments: [wordsComment, { ...blockComment, resolvedAt: null }],
      numbers: new Map([
        [1, 1],
        [2, 2],
      ]),
    });

    await user.click(screen.getByRole("button", { name: /^Comment 2,/ }));
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    // Before the save returns, open comment 1
    await user.click(screen.getByText("Marked"));
    await act(async () => finish({ ok: true }));

    expect(
      screen.getByRole("dialog", { name: "Comment 1" }),
    ).toBeInTheDocument();
  });

  it("says so when a change doesn't save, and stays open", async () => {
    onDelete.mockResolvedValue({ ok: false, error: "failed" });
    const user = userEvent.setup();
    withComments();
    await user.click(
      screen.getByRole("button", { name: "Comment 1, pending: “loop”" }),
    );

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

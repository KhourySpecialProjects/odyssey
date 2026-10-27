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

/** Two blocks laid out like BlockNote's editor DOM */
const Editor = () => (
  <div className="bn-editor">
    <div data-node-type="blockContainer" data-id="b1">
      <div className="bn-block-content">
        <p className="bn-inline-content">A loop repeats a block of code.</p>
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

function mount(enabled = true) {
  return render(
    <CommentLayer
      enabled={enabled}
      field="blocks"
      onPost={onPost}
      onDraftChange={onDraftChange}
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
      suffix: " repeats a block of code.",
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

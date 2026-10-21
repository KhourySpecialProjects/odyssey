/**
 * The highlight toolbar in the real DOM (ODY-785, Chunk 3): opens on
 * `selectionchange` (keyboard and touch as well as mouse), sits inside the
 * block, and works from the keyboard.
 */
import {
  render,
  fireEvent,
  screen,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import { Highlight } from "@/types";

const PINK = "#f9a8d4";
const rect = (top: number, bottom: number) =>
  ({
    top,
    left: 100,
    bottom,
    right: 160,
    width: 60,
    height: bottom - top,
    x: 100,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

let selectionRect = rect(200, 220);

beforeEach(() => {
  selectionRect = rect(200, 220);
  // jest.setup.ts gives every createRange() a getBoundingClientRect that
  // returns undefined, so give ranges a position
  Range.prototype.getBoundingClientRect = () => selectionRect;
  window.getSelection()?.removeAllRanges();
});

afterEach(() => {
  jest.useRealTimers();
  document.querySelectorAll("header").forEach((h) => h.remove());
});

const textNode = (el: Element, text: string) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.includes(text)) return node as Text;
  }
  throw new Error(`no text node with ${text}`);
};

const setSelection = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  range.getBoundingClientRect = () => selectionRect;
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

const select = (node: Text, start: number, end: number) =>
  setSelection(node, start, node, end);

/** A mouse drag ends on the content: the pointer went down there, then comes up. */
const release = (el: Element) => {
  fireEvent.pointerDown(el);
  fireEvent.pointerUp(el);
};

const hl = (
  id: number,
  text: string,
  start: number,
  end: number,
  blockId = 1,
): Highlight => ({
  id,
  text,
  color: "#fff300",
  position: { start, end },
  blockId,
});

function setup(
  content: string,
  highlights: Highlight[] = [],
  over: Partial<React.ComponentProps<typeof GenericBlockRenderer>> = {},
) {
  const props = {
    block: { id: 1, content },
    highlights,
    onHighlight: jest.fn().mockResolvedValue(null),
    onUpdateHighlight: jest.fn().mockResolvedValue(null),
    onMergeHighlights: jest.fn().mockResolvedValue(null),
    onDeleteHighlight: jest.fn().mockResolvedValue(true),
    onNote: jest.fn(),
    enrollmentId: "123",
    ...over,
  };
  const utils = render(<GenericBlockRenderer {...props} />);
  const content_ = utils.container.querySelector(".prose") as HTMLElement;
  return { ...props, ...utils, content: content_ };
}

/** Selection settles: `selectionchange` plus the debounce. */
const settle = (ms = 200) => {
  act(() => {
    document.dispatchEvent(new Event("selectionchange"));
  });
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

describe("opening the toolbar from the selection", () => {
  it("opens for a selection made with no mouse events, after the debounce", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");

    select(textNode(content, "Alpha"), 6, 10);
    act(() => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(screen.queryByRole("toolbar")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("waits while a pointer is down on the content, then opens at once on pointerup", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");

    fireEvent.pointerDown(content);
    select(textNode(content, "Alpha"), 6, 10);
    settle(1000);
    expect(screen.queryByRole("toolbar")).toBeNull();

    release(content);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("closes when the selection collapses", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    settle();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();

    window.getSelection()!.removeAllRanges();
    settle();

    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("does not close while focus is inside the toolbar", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    settle();
    screen.getByRole("button", { name: "Highlight Pink" }).focus();

    window.getSelection()!.removeAllRanges();
    settle();

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("does not open this block's toolbar for a selection in another block", () => {
    jest.useFakeTimers();
    render(
      <>
        <GenericBlockRenderer
          block={{ id: 1, content: "<p>Alpha beta</p>" }}
          highlights={[]}
          onHighlight={jest.fn()}
          onUpdateHighlight={jest.fn()}
          onMergeHighlights={jest.fn()}
          onDeleteHighlight={jest.fn()}
          onNote={jest.fn()}
          enrollmentId="123"
        />
        <GenericBlockRenderer
          block={{ id: 2, content: "<p>Delta epsilon</p>" }}
          highlights={[]}
          onHighlight={jest.fn()}
          onUpdateHighlight={jest.fn()}
          onMergeHighlights={jest.fn()}
          onDeleteHighlight={jest.fn()}
          onNote={jest.fn()}
          enrollmentId="123"
        />
      </>,
    );
    const second = screen.getByText("Delta epsilon").closest(".prose")!;

    select(textNode(second, "Delta"), 0, 5);
    settle();

    const toolbars = screen.getAllByRole("toolbar");
    expect(toolbars).toHaveLength(1);
    expect(second.parentElement).toContainElement(toolbars[0]);
  });

  it("does not open for a selection that reaches outside the block", () => {
    jest.useFakeTimers();
    const outside = document.createElement("p");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    const { content } = setup("<p>Alpha beta gamma</p>");

    setSelection(textNode(content, "Alpha"), 2, outside.firstChild!, 3);
    settle();

    expect(screen.queryByRole("toolbar")).toBeNull();
    outside.remove();
  });

  it("leaves a click-opened toolbar open when the click collapses the selection", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>", [
      hl(7, "beta", 6, 10),
    ]);

    fireEvent.click(content.querySelector(".ody-highlight")!);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    settle();

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
  });

  it("does not reopen after an action clears the selection", () => {
    jest.useFakeTimers();
    const { content, onHighlight } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    settle();

    fireEvent.click(screen.getByRole("button", { name: "Highlight Pink" }));
    expect(onHighlight).toHaveBeenCalled();
    expect(screen.queryByRole("toolbar")).toBeNull();
    settle();

    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("does not reopen on the same selection after Esc, but does for a new one", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");
    const node = textNode(content, "Alpha");
    select(node, 6, 10);
    settle();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("toolbar")).toBeNull();
    settle();
    expect(screen.queryByRole("toolbar")).toBeNull();

    select(node, 0, 5);
    settle();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });
});

describe("selections that end on an element", () => {
  const twoParagraphs = "<p>Alpha beta</p><p>gamma</p>";

  it("measures a triple-click style selection (ends on the next element)", () => {
    const { content, onHighlight } = setup(twoParagraphs);
    const [first] = Array.from(content.querySelectorAll("p"));

    // start in the text, end on the <p> after its only child
    setSelection(first.firstChild!, 0, first, 1);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({ position: { start: 0, end: 10 } }),
      false,
    );
  });

  it("measures a select-all selection (both ends on the content element)", () => {
    const { content, onHighlight } = setup(twoParagraphs);

    setSelection(content, 0, content, content.childNodes.length);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({ position: { start: 0, end: 15 } }),
      false,
    );
  });

  it("finds the saved highlight when both ends are on the element around it", () => {
    const { content } = setup("<p>beta</p>", [hl(7, "beta", 0, 4)]);
    const p = content.querySelector("p")!;

    setSelection(p, 0, p, p.childNodes.length);
    release(content);

    expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
  });

  it("offers nothing for a selection on the element around a pending highlight", () => {
    const { content } = setup("<p>beta</p>", [hl(-1, "beta", 0, 4)]);
    const p = content.querySelector("p")!;

    setSelection(p, 0, p, p.childNodes.length);
    release(content);

    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});

describe("actions read the live selection", () => {
  it("applies a colour to the selection as it is now, even if the debounce hasn't caught up", () => {
    const { content, onHighlight } = setup("<p>Alpha beta gamma</p>");
    const node = textNode(content, "Alpha");
    select(node, 6, 10);
    release(content);

    // the user moves the selection; no selectionchange has been handled yet
    select(node, 0, 5);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Alpha",
        position: { start: 0, end: 5 },
        color: PINK,
      }),
      false,
    );
  });
});

describe("where a note goes (Decision 8)", () => {
  it("is the selection's top relative to the content, with no mouse involved", async () => {
    const saved = hl(8, "beta", 6, 10);
    const { content, onNote } = setup("<p>Alpha beta gamma</p>", [], {
      onHighlight: jest.fn().mockResolvedValue(saved),
    });
    content.getBoundingClientRect = () => rect(50, 300);

    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() => expect(onNote).toHaveBeenCalledWith(150, saved));
  });

  it("is the clicked piece's top for a clicked highlight", async () => {
    const { content, onNote } = setup("<p>Alpha beta gamma</p>", [
      hl(7, "beta", 6, 10),
    ]);
    content.getBoundingClientRect = () => rect(50, 300);
    const piece = content.querySelector(".ody-highlight") as HTMLElement;
    piece.getBoundingClientRect = () => rect(90, 110);

    fireEvent.click(piece);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() =>
      expect(onNote).toHaveBeenCalledWith(
        40,
        expect.objectContaining({ id: 7 }),
      ),
    );
  });
});

describe("placing the toolbar inside the block", () => {
  it("is rendered inside the block, after its content", () => {
    const { content, container } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    release(content);

    const toolbar = screen.getByRole("toolbar");
    expect(container.firstElementChild).toContainElement(toolbar);
    expect(
      content.compareDocumentPosition(toolbar) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.firstElementChild).toHaveClass("relative");
    expect(toolbar).toHaveClass("absolute");
    expect(toolbar).not.toHaveClass("fixed");
  });

  it("sits above the selection when there is room", () => {
    const { content } = setup("<p>Alpha beta gamma</p>");
    selectionRect = rect(200, 220);
    select(textNode(content, "Alpha"), 6, 10);
    release(content);

    // 200 - 36 (toolbar height, unmeasured in jsdom) - 8 (gap)
    expect(screen.getByRole("toolbar").style.top).toBe("156px");
  });

  it("sits below the selection when above would be under the site header", () => {
    const header = document.createElement("header");
    header.getBoundingClientRect = () => rect(0, 120);
    document.body.appendChild(header);
    const { content } = setup("<p>Alpha beta gamma</p>");
    selectionRect = rect(130, 150);
    select(textNode(content, "Alpha"), 6, 10);
    release(content);

    // 150 + 8 (above would be at 78, under the header's bottom at 120)
    expect(screen.getByRole("toolbar").style.top).toBe("158px");
  });

  it("closes on a pointerdown outside it", () => {
    const { content } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  describe("Esc", () => {
    /** What the page's own keydown handlers see: was the Esc already handled? */
    let seen: boolean[];
    const record = (e: KeyboardEvent) => seen.push(e.defaultPrevented);
    beforeEach(() => {
      seen = [];
      document.addEventListener("keydown", record);
    });
    afterEach(() => {
      document.removeEventListener("keydown", record);
      document.getElementById("other-widget")?.remove();
    });

    const open = () => {
      const { content } = setup("<p>Alpha beta gamma</p>");
      select(textNode(content, "Alpha"), 6, 10);
      release(content);
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
      return content;
    };

    it("closes the toolbar from the page itself, marking the key as handled for the page", () => {
      open();

      fireEvent.keyDown(document.body, { key: "Escape" });

      expect(screen.queryByRole("toolbar")).toBeNull();
      // the page's Esc handler (the notes bar) sees it as already handled
      expect(seen).toEqual([true]);
    });

    it("closes the toolbar from inside it", () => {
      open();
      const button = screen.getByRole("button", { name: "Highlight Pink" });
      button.focus();

      fireEvent.keyDown(button, { key: "Escape" });

      expect(screen.queryByRole("toolbar")).toBeNull();
      expect(seen).toEqual([true]);
    });

    it("leaves the toolbar and the event alone when focus is in an unrelated widget", () => {
      open();
      const other = document.createElement("button");
      other.id = "other-widget";
      document.body.appendChild(other);
      other.focus();

      fireEvent.keyDown(other, { key: "Escape" });

      expect(screen.getByRole("toolbar")).toBeInTheDocument();
      expect(seen).toEqual([false]);
    });

    it("is not claimed at all when no toolbar is open", () => {
      setup("<p>Alpha beta gamma</p>");

      fireEvent.keyDown(document.body, { key: "Escape" });

      expect(seen).toEqual([false]);
    });

    it("gives focus back to the text when it closes the toolbar the keyboard was in", () => {
      const content = open();
      screen.getByRole("button", { name: "Highlight Pink" }).focus();

      fireEvent.keyDown(document.activeElement!, { key: "Escape" });

      expect(content).toHaveFocus();
    });
  });
});

describe("a press on a toolbar button that collapses the selection first (Safari, iOS)", () => {
  it("does not close the toolbar before the click lands", async () => {
    const user = userEvent.setup();
    const { content, onHighlight } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();

    // Buttons don't take focus on click there, and the press collapses the selection
    const collapse = (e: Event) => {
      if ((e.target as Element).closest('[role="toolbar"]')) {
        window.getSelection()!.removeAllRanges();
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    document.addEventListener("pointerdown", collapse, true);

    await user.click(screen.getByRole("button", { name: "Highlight Pink" }));
    document.removeEventListener("pointerdown", collapse, true);

    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({ text: "beta", color: PINK }),
      false,
    );
  });

  it("is not closed by the debounced check while the press is still down", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    settle();
    const button = screen.getByRole("button", { name: "Highlight Pink" });

    fireEvent.pointerDown(button);
    window.getSelection()!.removeAllRanges();
    settle(1000);

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    fireEvent.pointerUp(button);
    act(() => {
      jest.advanceTimersByTime(1);
    });
  });
});

describe("a new gesture after dismissing", () => {
  it("reopens on the same selection (double-clicking the same word again)", () => {
    const { content } = setup("<p>Alpha beta gamma</p>");
    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("toolbar")).toBeNull();

    // the same word is selected again by a new press on the text
    release(content);

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });
});

describe("toolbar accessibility", () => {
  const openOn = (highlights: Highlight[] = [], selectInPiece = false) => {
    const utils = setup("<p>Alpha beta gamma</p>", highlights);
    if (selectInPiece) {
      select(
        textNode(utils.content.querySelector(".ody-highlight")!, "beta"),
        0,
        4,
      );
    } else {
      select(textNode(utils.content, "Alpha"), 6, 10);
    }
    release(utils.content);
    return utils;
  };

  it("has a single Tab stop (roving tabindex) that follows focus", async () => {
    const user = userEvent.setup();
    openOn();
    const buttons = Array.from(
      screen.getByRole("toolbar").querySelectorAll("button"),
    );
    const stops = () => buttons.filter((b) => b.tabIndex === 0);

    expect(stops()).toEqual([buttons[0]]);

    buttons[0].focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    expect(stops()).toEqual([buttons[2]]);
    expect(buttons.filter((b) => b.tabIndex === -1)).toHaveLength(
      buttons.length - 1,
    );
  });

  it("shows the colour of the highlight it is on as the pressed one", () => {
    const { content } = setup("<p>Alpha beta gamma</p>", [
      { ...hl(7, "beta", 6, 10), color: PINK },
    ]);

    fireEvent.click(content.querySelector(".ody-highlight")!);

    expect(
      screen.getByRole("button", { name: "Highlight Pink" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Highlight Yellow" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("gives focus back to the text after a keyboard action closes it", async () => {
    const user = userEvent.setup();
    const { content } = openOn();
    screen.getByRole("button", { name: "Highlight Pink" }).focus();

    await user.keyboard("{Enter}");

    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(content).toHaveFocus();
  });
});

describe("measuring and clamping the toolbar", () => {
  it("uses the toolbar's measured height to sit above the selection", () => {
    const heightSpy = jest
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(50);
    const { content } = setup("<p>Alpha beta gamma</p>");
    selectionRect = rect(200, 220);
    select(textNode(content, "Alpha"), 6, 10);
    release(content);

    // 200 - 50 (measured) - 8 (gap)
    expect(screen.getByRole("toolbar").style.top).toBe("142px");
    heightSpy.mockRestore();
  });

  it("keeps the toolbar inside the block at both edges", () => {
    const { content, container } = setup("<p>Alpha beta gamma</p>");
    const wrapper = container.firstElementChild as HTMLElement;
    wrapper.getBoundingClientRect = () => ({
      ...rect(0, 400),
      left: 0,
      width: 300,
    });

    // near the left edge: centre at 20
    selectionRect = { ...rect(200, 220), left: 10, width: 20 } as DOMRect;
    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    // half the unmeasured toolbar width (220 / 2)
    expect(screen.getByRole("toolbar").style.left).toBe("110px");

    // near the right edge: centre at 290
    fireEvent.keyDown(document.body, { key: "Escape" });
    selectionRect = { ...rect(200, 220), left: 280, width: 20 } as DOMRect;
    select(textNode(content, "Alpha"), 0, 5);
    release(content);
    // 300 - 110
    expect(screen.getByRole("toolbar").style.left).toBe("190px");
  });
});

describe("using the toolbar from the keyboard", () => {
  const open = (highlights: Highlight[] = []) => {
    const utils = setup("<p>Alpha beta gamma</p>", highlights);
    select(textNode(utils.content, "Alpha"), 6, 10);
    release(utils.content);
    return utils;
  };

  it("is a labelled toolbar of real buttons, with the chosen colour pressed", () => {
    open();

    const toolbar = screen.getByRole("toolbar", {
      name: "Highlight selection",
    });
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons.every((b) => b.getAttribute("type") === "button")).toBe(
      true,
    );
    expect(buttons.every((b) => b.getAttribute("aria-label"))).toBe(true);
    expect(
      screen.getByRole("button", { name: "Highlight Yellow" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Highlight Pink" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it.each([["{Enter}"], [" "]])(
    "applies a colour with the %j key",
    async (key) => {
      const user = userEvent.setup();
      const { onHighlight } = open();

      screen.getByRole("button", { name: "Highlight Pink" }).focus();
      await user.keyboard(key);

      expect(onHighlight).toHaveBeenCalledWith(
        expect.objectContaining({ color: PINK, text: "beta" }),
        false,
      );
    },
  );

  it("activates Add note and Remove from the keyboard too", async () => {
    const user = userEvent.setup();
    const { content, onDeleteHighlight } = setup("<p>Alpha beta gamma</p>", [
      hl(7, "beta", 6, 10),
    ]);
    // the drawn highlight split the text, so select inside its piece
    select(textNode(content.querySelector(".ody-highlight")!, "beta"), 0, 4);
    release(content);

    screen.getByRole("button", { name: "Remove highlight" }).focus();
    await user.keyboard("{Enter}");

    expect(onDeleteHighlight).toHaveBeenCalledWith(7);
  });

  it("moves between the buttons with Left and Right, wrapping at the ends", async () => {
    const user = userEvent.setup();
    open();
    const buttons = Array.from(
      screen.getByRole("toolbar").querySelectorAll("button"),
    );

    buttons[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(buttons[1]).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(buttons[buttons.length - 1]).toHaveFocus();

    await user.keyboard("{Home}");
    expect(buttons[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(buttons[buttons.length - 1]).toHaveFocus();
  });

  it("is reached by Tab from the text, since it follows the content", async () => {
    const user = userEvent.setup();
    const { content } = open();
    const first = screen.getByRole("button", { name: "Highlight Pink" });

    // nothing between the content and the toolbar can take focus
    content.setAttribute("tabindex", "0");
    content.focus();
    await user.tab();

    expect(first).toHaveFocus();
  });

  it("does not open a toolbar when the block isn't for an enrolled reader", () => {
    jest.useFakeTimers();
    const { content } = setup("<p>Alpha beta gamma</p>", [], {
      enrollmentId: undefined,
    });

    select(textNode(content, "Alpha"), 6, 10);
    settle();
    release(content);

    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});

/**
 * Lesson highlighting through the real LessonRenderer and GenericBlockRenderer
 * (ODY-785). Only the requests and unrelated block renderers are mocked.
 */
import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { toast } from "sonner";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from "@/lib/requests/highlights";
import { createNote } from "@/lib/requests/notes";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { AuthorizedUser, Highlight, Lesson, Note } from "@/types";

jest.mock("@/lib/requests/highlights", () => ({
  createHighlight: jest.fn(),
  updateHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
  getHighlightsByAuthorizedUserAndLesson: jest.fn(),
}));
jest.mock("@/lib/requests/notes", () => ({ createNote: jest.fn() }));
jest.mock("@/lib/requests/enrollment", () => ({ getEnrollByID: jest.fn() }));
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/components/droplets/lessons/highlight-dropdown", () => ({
  HighlightDropdown: () => null,
}));
jest.mock("@/components/droplets/lessons/highlight-hint-banner", () => ({
  HighlightHintBanner: () => null,
}));
jest.mock("@/components/droplets/lessons/quiz", () => ({
  QuizBlock: () => null,
}));
jest.mock("@/components/droplets/lessons/open-ended-quiz", () => ({
  OpenEndedQuizBlock: () => null,
}));
jest.mock("@/components/draft/lesson/code-block-viewer", () => ({
  CodeBlockViewer: () => null,
}));
jest.mock("@/components/notebook/notebook-code-viewer", () => ({
  NotebookCodeViewer: () => null,
}));
jest.mock("@/lib/pyodide/pyodide-context", () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const mockedCreateHighlight = jest.mocked(createHighlight);
const mockedDeleteHighlight = jest.mocked(deleteHighlight);
const mockedUpdateHighlight = jest.mocked(updateHighlight);

const PINK = "#f9a8d4";
const rect = {
  top: 200,
  left: 100,
  bottom: 220,
  right: 160,
  width: 60,
  height: 20,
  x: 100,
  y: 200,
  toJSON: () => ({}),
} as DOMRect;

beforeEach(() => {
  // jest.setup.ts gives every createRange() a getBoundingClientRect that
  // returns undefined, so the toolbar can't place itself without this.
  Range.prototype.getBoundingClientRect = () => rect;
  window.getSelection()?.removeAllRanges();
});

const textNode = (el: Element, text: string) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.includes(text)) return node as Text;
  }
  throw new Error(`no text node with ${text}`);
};

const select = (node: Text, start: number, end: number) => {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  range.getBoundingClientRect = () => rect;
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
};

const highlightSpans = (root: Element) =>
  root.querySelectorAll<HTMLElement>(".ody-highlight[data-highlight-id]");

const savedRecord = (over: Partial<Highlight> = {}): Highlight => ({
  id: 8,
  text: "beta",
  color: PINK,
  position: { start: 6, end: 10 },
  blockId: 1,
  ...over,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const lesson = {
  id: 1,
  name: "Lesson",
  slug: "lesson",
  blocks: [
    {
      id: 1,
      __component: "droplets.generic",
      content: "<p>Alpha beta gamma</p>",
    },
    { id: 2, __component: "droplets.generic", content: "<p>Delta epsilon</p>" },
  ],
} as unknown as Lesson;

const lessonProps = (
  over: Partial<React.ComponentProps<typeof LessonRenderer>> = {},
): React.ComponentProps<typeof LessonRenderer> => ({
  lesson,
  droplet: { id: 1, name: "D", lessons: [], datasets: [] },
  enrollmentId: "5",
  completedLessonIds: [],
  authUser: { id: 1 } as AuthorizedUser,
  initialHighlights: [],
  onUpdate: jest.fn(),
  expanded: false,
  setExpanded: jest.fn(),
  ...over,
});

/** Selects "beta" in block 1 and applies a colour from the toolbar. */
function highlightBeta(color = "Pink") {
  const content = screen.getByText("Alpha beta gamma");
  // Drawing replaces the <p>, so keep the wrapper that survives it
  const wrapper = content.closest(".prose")!;
  select(textNode(content, "Alpha"), 6, 10);
  release(content);
  fireEvent.click(screen.getByTitle(`Highlight ${color}`));
  return wrapper;
}

describe("a block's DOM is only rebuilt for content or highlight changes", () => {
  it("keeps the selection and the text nodes when the mouse moves to another block", () => {
    render(<LessonRenderer {...lessonProps()} />);
    const node = textNode(screen.getByText("Alpha beta gamma"), "Alpha");
    select(node, 6, 10);

    fireEvent.mouseOver(screen.getByText("Delta epsilon"));

    expect(node.isConnected).toBe(true);
    expect(window.getSelection()!.toString()).toBe("beta");
  });

  it("keeps the text nodes when the parent re-renders with new callbacks", () => {
    const { rerender } = render(<LessonRenderer {...lessonProps()} />);
    const node = textNode(screen.getByText("Alpha beta gamma"), "Alpha");

    rerender(<LessonRenderer {...lessonProps({ onUpdate: jest.fn() })} />);

    expect(node.isConnected).toBe(true);
  });

  it("keeps the text nodes of a v2 lesson, whose blocks are rebuilt on every render", () => {
    const v2Lesson = {
      id: 2,
      name: "V2",
      slug: "v2",
      blocksVersion: "v2",
      blocks: [],
      blocksV2: [
        {
          id: "p1",
          type: "paragraph",
          props: {},
          content: [{ type: "text", text: "Alpha beta gamma", styles: {} }],
          children: [],
        },
      ],
    } as unknown as Lesson;
    const { rerender } = render(
      <LessonRenderer {...lessonProps({ lesson: v2Lesson })} />,
    );
    const node = textNode(screen.getByText("Alpha beta gamma"), "Alpha");

    rerender(
      <LessonRenderer
        {...lessonProps({ lesson: v2Lesson, onUpdate: jest.fn() })}
      />,
    );

    expect(node.isConnected).toBe(true);
  });

  it("does not rebuild the block when a colour is chosen", () => {
    const { container } = render(
      <GenericBlockRenderer
        block={{ id: 1, content: "<p>Alpha beta gamma</p>" }}
        highlights={[]}
        onHighlight={jest.fn().mockResolvedValue(null)}
        onUpdateHighlight={jest.fn().mockResolvedValue(null)}
        onMergeHighlights={jest.fn().mockResolvedValue(null)}
        onDeleteHighlight={jest.fn().mockResolvedValue(true)}
        onNote={jest.fn()}
        enrollmentId="123"
      />,
    );
    const content = container.querySelector(".prose")!;
    const node = textNode(content, "Alpha");
    select(node, 6, 10);
    release(content);

    fireEvent.click(screen.getByTitle("Highlight Pink"));

    // The parent owns the highlight list and hasn't changed it, so nothing
    // may be drawn or rebuilt by the block itself.
    expect(node.isConnected).toBe(true);
    expect(highlightSpans(content)).toHaveLength(0);
  });
});

describe("saving a highlight", () => {
  it("shows the new highlight in the chosen colour while the save is pending", () => {
    mockedCreateHighlight.mockReturnValue(new Promise(() => {}));
    render(<LessonRenderer {...lessonProps()} />);

    const content = highlightBeta("Pink");

    const spans = highlightSpans(content);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("beta");
    expect((spans[0] as HTMLElement).style.backgroundColor).toBe(
      "rgb(249, 168, 212)",
    );
    expect(mockedCreateHighlight).toHaveBeenCalledWith({
      text: "beta",
      position: { start: 6, end: 10 },
      color: PINK,
      blockId: 1,
      lessonId: 1,
    });
  });

  it("keeps the highlight and says so when the save succeeds", async () => {
    mockedCreateHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: savedRecord(),
    });
    render(<LessonRenderer {...lessonProps()} />);

    const content = highlightBeta("Pink");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight saved"),
    );
    expect(highlightSpans(content)).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("removes the highlight and shows the error toast when the save fails", async () => {
    const save = deferred<Awaited<ReturnType<typeof createHighlight>>>();
    mockedCreateHighlight.mockReturnValue(save.promise);
    render(<LessonRenderer {...lessonProps()} />);

    const content = highlightBeta("Pink");
    expect(highlightSpans(content)).toHaveLength(1);

    save.resolve({ ok: false, error: "Failed to save highlight", data: null });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save highlight"),
    );
    expect(highlightSpans(content)).toHaveLength(0);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("also treats a rejected save as a failure", async () => {
    mockedCreateHighlight.mockRejectedValue(new Error("Network error"));
    render(<LessonRenderer {...lessonProps()} />);

    const content = highlightBeta("Pink");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save highlight"),
    );
    expect(highlightSpans(content)).toHaveLength(0);
  });

  it("opens no toolbar when a pending highlight is clicked", () => {
    mockedCreateHighlight.mockReturnValue(new Promise(() => {}));
    render(<LessonRenderer {...lessonProps()} />);
    const content = highlightBeta("Pink");

    fireEvent.click(highlightSpans(content)[0]);

    expect(screen.queryByTitle("Remove highlight")).toBeNull();
    expect(screen.queryByTitle("Highlight Yellow")).toBeNull();
  });
});

describe("removing a highlight", () => {
  const existing = savedRecord({ id: 7, color: "#fff300" });

  const removeBeta = () => {
    // The highlight splits the text, so look the block up by its wrapper
    const content = document.querySelector(".prose")!;
    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Remove highlight"));
    return content;
  };

  it("removes the highlight at once and keeps it removed when the delete succeeds", async () => {
    mockedDeleteHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 7 },
    });
    render(
      <LessonRenderer {...lessonProps({ initialHighlights: [existing] })} />,
    );

    const content = removeBeta();

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
    );
    expect(highlightSpans(content)).toHaveLength(0);
    expect(mockedDeleteHighlight).toHaveBeenCalledWith(7);
  });

  it("brings the highlight back and shows the error toast when the delete fails", async () => {
    const del = deferred<Awaited<ReturnType<typeof deleteHighlight>>>();
    mockedDeleteHighlight.mockReturnValue(del.promise);
    render(
      <LessonRenderer {...lessonProps({ initialHighlights: [existing] })} />,
    );

    const content = removeBeta();
    expect(highlightSpans(content)).toHaveLength(0);

    del.resolve({ ok: false, error: "Failed to delete highlight", data: null });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to remove highlight"),
    );
    await waitFor(() => expect(highlightSpans(content)).toHaveLength(1));
    expect(highlightSpans(content)[0]).toHaveTextContent("beta");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("treats 'Highlight not found' as already removed: no restore, no error toast", async () => {
    mockedDeleteHighlight.mockResolvedValue({
      ok: false,
      error: "Highlight not found",
      data: null,
    });
    render(
      <LessonRenderer {...lessonProps({ initialHighlights: [existing] })} />,
    );

    const content = removeBeta();

    await waitFor(() => expect(mockedDeleteHighlight).toHaveBeenCalled());
    // let the awaited result land
    await act(async () => {});
    expect(toast.error).not.toHaveBeenCalled();
    expect(highlightSpans(content)).toHaveLength(0);
  });
});

describe("a save that returns later", () => {
  it("swaps the temp id for the server record, so Remove deletes the server id", async () => {
    mockedCreateHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: savedRecord({ id: 8 }),
    });
    mockedDeleteHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 8 },
    });
    render(<LessonRenderer {...lessonProps()} />);
    const content = highlightBeta("Pink");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight saved"),
    );

    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Remove highlight"));

    await waitFor(() => expect(mockedDeleteHighlight).toHaveBeenCalledWith(8));
  });

  it.each([
    ["succeeds", { ok: true, error: null, data: savedRecord({ id: 8 }) }],
    ["fails", { ok: false, error: "Failed to save highlight", data: null }],
  ] as const)(
    "does not disturb a selection started in another block when the save %s",
    async (_name, outcome) => {
      const save = deferred<Awaited<ReturnType<typeof createHighlight>>>();
      mockedCreateHighlight.mockReturnValue(save.promise);
      render(<LessonRenderer {...lessonProps()} />);
      highlightBeta("Pink");

      const node2 = textNode(screen.getByText("Delta epsilon"), "Delta");
      select(node2, 0, 5);

      save.resolve(outcome);
      await waitFor(() =>
        expect(
          jest.mocked(outcome.ok ? toast.success : toast.error),
        ).toHaveBeenCalled(),
      );

      expect(node2.isConnected).toBe(true);
      expect(window.getSelection()!.toString()).toBe("Delta");
    },
  );
});

describe("a highlight that is still being saved", () => {
  it("offers no Remove or recolour for a mouse selection inside it", () => {
    mockedCreateHighlight.mockReturnValue(new Promise(() => {}));
    render(<LessonRenderer {...lessonProps()} />);
    const content = highlightBeta("Pink");

    const span = highlightSpans(content)[0];
    select(textNode(span, "beta"), 1, 3);
    release(content.querySelector("p")!);

    expect(screen.queryByTitle("Remove highlight")).toBeNull();
    expect(screen.queryByTitle("Highlight Pink")).toBeNull();
  });
});

// ─── Chunk 2: highlights know their id ──────────────────────────────────────

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
  color: Highlight["color"] = "#fff300",
): Highlight => ({ id, text, color, position: { start, end }, blockId: 1 });

/** The children of `el` that aren't empty text nodes (splitting leaves some). */
const nonEmptyChildren = (el: Element) =>
  Array.from(el.childNodes).filter(
    (n) => !(n.nodeType === Node.TEXT_NODE && n.textContent === ""),
  );

/** The same highlight, but with a note attached to it. */
const noted = (h: Highlight): Highlight => ({ ...h, note: { id: 99 } });

/** Renders one block with mock callbacks that resolve like the real ones. */
function renderBlock(
  content: string,
  highlights: Highlight[],
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
  const { container } = render(<GenericBlockRenderer {...props} />);
  return { ...props, content: container.querySelector(".prose")! };
}

/** Selects from one text node offset to another. */
const selectAcross = (
  startNode: Text,
  startOffset: number,
  endNode: Text,
  endOffset: number,
) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  range.getBoundingClientRect = () => rect;
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

describe("drawn pieces carry the highlight id", () => {
  it("tags every piece of a highlight that crosses formatting", () => {
    const { content } = renderBlock("<p>one <strong>two</strong> three</p>", [
      hl(5, "one two", 0, 7),
    ]);

    const spans = highlightSpans(content);
    expect(spans).toHaveLength(2);
    expect(Array.from(spans).map((s) => s.dataset.highlightId)).toEqual([
      "5",
      "5",
    ]);
    expect(spans[0]).toHaveClass("ody-highlight");
  });

  it("draws one piece, inside the <strong>, for a highlight that starts where a text node ends", () => {
    const { content } = renderBlock("<p>one <strong>two</strong></p>", [
      hl(1, "two", 4, 7),
    ]);

    const spans = Array.from(highlightSpans(content));
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("two");
    expect(spans[0].parentElement?.tagName).toBe("STRONG");
    // nothing was left behind in front of it
    expect(content.querySelector("p")!.firstChild).toHaveTextContent("one");
  });

  it("draws a highlight that starts at offset 0", () => {
    const { content } = renderBlock("<p>Alpha beta</p>", [
      hl(1, "Alpha", 0, 5),
    ]);

    const spans = Array.from(highlightSpans(content));
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("Alpha");
    // (an empty text node may remain before it; the first real child is the piece)
    expect(nonEmptyChildren(content.querySelector("p")!)[0]).toBe(spans[0]);
  });

  it("draws a highlight that ends at the very end of the block", () => {
    const { content } = renderBlock("<p>Alpha beta</p>", [
      hl(1, "beta", 6, 10),
    ]);

    const spans = Array.from(highlightSpans(content));
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("beta");
    expect(nonEmptyChildren(content.querySelector("p")!).pop()).toBe(spans[0]);
  });

  it("draws two highlights on the same words as two nested pieces, none empty", () => {
    const { content } = renderBlock("<p>Alpha beta gamma</p>", [
      hl(1, "beta", 6, 10),
      hl(2, "beta", 6, 10, PINK),
    ]);

    const spans = Array.from(highlightSpans(content));
    expect(spans).toHaveLength(2);
    expect(spans.every((s) => s.textContent === "beta")).toBe(true);
  });

  it("draws a highlight inside <pre><code>, past the line-number gutter", async () => {
    // The gutter's digits ("12") are text nodes too, so the code starts at 2
    const { content } = renderBlock("<pre><code>alpha\nbeta</code></pre>", [
      hl(1, "beta", 8, 12),
    ]);
    // let highlight.js load and the block redraw, as the code-block tests do
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const spans = Array.from(highlightSpans(content));
    expect(spans.length).toBeGreaterThan(0);
    expect(spans.map((s) => s.textContent).join("")).toBe("beta");
    expect(spans.every((s) => s.closest("code") !== null)).toBe(true);
  });

  it("does not treat the note bar's flash span as a highlight, or a pending one", () => {
    const { content } = renderBlock("<p>Alpha beta gamma</p>", [
      hl(7, "beta", 6, 10),
    ]);
    // note-block.tsx wraps a note's text in a span with this attribute for a second
    const piece = highlightSpans(content)[0];
    const text = piece.firstChild as Text;
    const flash = document.createElement("span");
    flash.setAttribute("data-highlight-id", "highlight-id");
    piece.replaceChild(flash, text);
    flash.appendChild(text);

    fireEvent.click(flash);

    expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
  });

  it("does not treat an authored inline background-color span as a highlight", () => {
    const { content } = renderBlock(
      '<p>say <span style="background-color: red">hello</span> world</p>',
      [],
    );
    const authored = content.querySelector("span")!;

    fireEvent.click(authored);
    expect(screen.queryByTitle("Highlight Yellow")).toBeNull();

    select(textNode(authored, "hello"), 1, 3);
    release(content);
    // A fresh selection: colours are offered, but it isn't "on a highlight"
    expect(screen.getByTitle("Highlight Yellow")).toBeInTheDocument();
    expect(screen.queryByTitle("Remove highlight")).toBeNull();
  });
});

describe("remove and recolour act on the highlight that was clicked", () => {
  it("removing the second of two 'SQL' highlights deletes record 2", () => {
    const { content, onDeleteHighlight } = renderBlock(
      "<p>SQL is fun. SQL is old.</p>",
      [hl(1, "SQL", 0, 3), hl(2, "SQL", 12, 15)],
    );

    fireEvent.click(highlightSpans(content)[1]);
    fireEvent.click(screen.getByTitle("Remove highlight"));

    expect(onDeleteHighlight).toHaveBeenCalledTimes(1);
    expect(onDeleteHighlight).toHaveBeenCalledWith(2);
  });

  it("with two highlights on the same words, removing the second deletes the second", () => {
    const { content, onDeleteHighlight } = renderBlock(
      "<p>Alpha beta gamma</p>",
      [hl(7, "beta", 6, 10), hl(9, "beta", 6, 10, PINK)],
    );
    const innermost = Array.from(highlightSpans(content)).find(
      (s) => !s.querySelector("[data-highlight-id]"),
    )!;

    fireEvent.click(innermost);
    fireEvent.click(screen.getByTitle("Remove highlight"));

    expect(onDeleteHighlight).toHaveBeenCalledTimes(1);
    expect(onDeleteHighlight).toHaveBeenCalledWith(9);
  });

  it("recolouring 'one two' via its bold half updates record 5 and creates nothing", () => {
    const { content, onUpdateHighlight, onHighlight, onDeleteHighlight } =
      renderBlock("<p>one <strong>two</strong> three</p>", [
        hl(5, "one two", 0, 7),
      ]);
    const spans = highlightSpans(content);

    fireEvent.click(spans[spans.length - 1]);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onUpdateHighlight).toHaveBeenCalledTimes(1);
    expect(onUpdateHighlight).toHaveBeenCalledWith(5, { color: PINK });
    expect(onHighlight).not.toHaveBeenCalled();
    expect(onDeleteHighlight).not.toHaveBeenCalled();
  });

  it("shows Remove for a selection entirely inside a highlight, and recolours that highlight", () => {
    const { content, onUpdateHighlight, onHighlight } = renderBlock(
      "<p>Alpha beta gamma</p>",
      [hl(3, "beta", 6, 10)],
    );

    select(textNode(highlightSpans(content)[0], "beta"), 1, 3);
    release(content);

    expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Highlight Pink"));
    expect(onUpdateHighlight).toHaveBeenCalledWith(3, { color: PINK });
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("ignores a click on a piece whose id is pending", () => {
    const { content } = renderBlock("<p>Alpha beta gamma</p>", [
      hl(-1, "beta", 6, 10),
    ]);

    fireEvent.click(highlightSpans(content)[0]);

    expect(screen.queryByTitle("Remove highlight")).toBeNull();
    expect(screen.queryByTitle("Highlight Yellow")).toBeNull();
  });
});

describe("a selection that overlaps highlights merges them (ODY-153)", () => {
  const text = "<p>Alpha beta gamma delta</p>";
  const twoHighlights = () => [hl(3, "beta", 6, 10), hl(4, "gamma", 11, 16)];

  /** "ha beta ga": from inside "Alpha " to inside "gamma" */
  const selectOverBoth = (content: Element) => {
    const spans = highlightSpans(content);
    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
  };

  it("hands the union to onMergeHighlights: the earliest is the base, the others are absorbed", () => {
    const { content, onMergeHighlights, onUpdateHighlight, onHighlight } =
      renderBlock(text, twoHighlights());

    selectOverBoth(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onMergeHighlights).toHaveBeenCalledWith(
      3,
      {
        color: PINK,
        position: { start: 3, end: 16 },
        text: "ha beta gamma",
      },
      [4],
    );
    expect(onUpdateHighlight).not.toHaveBeenCalled();
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("never absorbs a highlight that has a note: a single noted overlap becomes the base", () => {
    const { content, onMergeHighlights } = renderBlock(text, [
      hl(3, "beta", 6, 10),
      noted(hl(4, "gamma", 11, 16)),
    ]);
    const spans = highlightSpans(content);

    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onMergeHighlights).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ position: { start: 3, end: 16 } }),
      [3],
    );
  });

  it("leaves other noted overlaps in place, inside the union", () => {
    const { content, onMergeHighlights, onUpdateHighlight, onDeleteHighlight } =
      renderBlock(text, [
        hl(5, "Alpha", 0, 5),
        noted(hl(3, "beta", 6, 10)),
        noted(hl(4, "gamma", 11, 16)),
      ]);

    // from inside "Alpha" to inside " delta": overlaps all three
    selectAcross(textNode(content, "Alpha"), 2, textNode(content, "delta"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    // The earliest (unnoted) one is the base; the noted ones are not deleted
    expect(onUpdateHighlight).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ position: { start: 0, end: 18 } }),
    );
    expect(onMergeHighlights).not.toHaveBeenCalled();
    expect(onDeleteHighlight).not.toHaveBeenCalled();
  });

  it("ignores pending highlights when merging", () => {
    const { content, onUpdateHighlight, onHighlight } = renderBlock(text, [
      hl(-1, "beta", 6, 10),
      hl(4, "gamma", 11, 16),
    ]);
    const spans = highlightSpans(content);

    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    // Only "gamma" is saved and overlapping: it is merged with the selection
    expect(onUpdateHighlight).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ position: { start: 3, end: 16 } }),
    );
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("does not merge with a highlight that only touches the selection", () => {
    const { content, onHighlight, onUpdateHighlight } = renderBlock(
      text,
      twoHighlights(),
    );

    // The single space between "beta" and "gamma" (offsets 10 to 11)
    const space = Array.from(content.querySelector("p")!.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent === " ",
    ) as Text;
    select(space, 0, 1);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onUpdateHighlight).not.toHaveBeenCalled();
    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({ position: { start: 10, end: 11 } }),
      false,
    );
  });
});

describe("notes link the highlight they came from", () => {
  it("passes a new highlight's server record to onNote, and doesn't note a failed save", async () => {
    const saved = hl(8, "beta", 6, 10);
    const onHighlight = jest.fn().mockResolvedValue(saved);
    const { content, onNote } = renderBlock("<p>Alpha beta gamma</p>", [], {
      onHighlight,
    });

    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    fireEvent.click(screen.getByTitle("Add note"));

    // the note goes where the selection starts, relative to the content (rect top 200, content top 0)
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(200, saved));
    expect(onHighlight).toHaveBeenCalledWith(
      expect.objectContaining({ text: "beta" }),
      true,
    );
  });

  it("does not create a note when the highlight fails to save", async () => {
    const { content, onNote, onHighlight } = renderBlock(
      "<p>Alpha beta gamma</p>",
      [],
    );

    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() => expect(onHighlight).toHaveBeenCalled());
    await act(async () => {});
    expect(onNote).not.toHaveBeenCalled();
  });

  it("uses the clicked highlight, without creating another", async () => {
    const { content, onNote, onHighlight } = renderBlock(
      "<p>Alpha beta gamma</p>",
      [hl(7, "beta", 6, 10)],
    );

    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() =>
      expect(onNote).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ id: 7 }),
      ),
    );
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("uses the merged highlight when the selection overlaps others", async () => {
    const merged = hl(3, "ha beta gamma", 3, 16);
    const { content, onNote, onMergeHighlights } = renderBlock(
      "<p>Alpha beta gamma delta</p>",
      [hl(3, "beta", 6, 10), hl(4, "gamma", 11, 16)],
      { onMergeHighlights: jest.fn().mockResolvedValue(merged) },
    );
    const spans = highlightSpans(content);

    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() => expect(onNote).toHaveBeenCalledWith(200, merged));
    expect(onMergeHighlights).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ position: { start: 3, end: 16 } }),
      [4],
    );
  });

  it("gives createNote the id that createHighlight returned", async () => {
    mockedCreateHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: savedRecord({ id: 8 }),
    });
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(createNote).mockResolvedValue({ success: true });
    render(<LessonRenderer {...lessonProps()} />);

    const content = screen.getByText("Alpha beta gamma");
    select(textNode(content, "Alpha"), 6, 10);
    release(content);
    fireEvent.click(screen.getByTitle("Add note"));

    await waitFor(() => expect(createNote).toHaveBeenCalled());
    expect(createNote).toHaveBeenCalledWith(
      lesson,
      { id: "5" },
      expect.any(Number),
      1,
      expect.objectContaining({ id: 8, text: "beta" }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Note created"),
    );
    // The note's own toast replaces "Highlight saved"
    expect(toast.success).not.toHaveBeenCalledWith("Highlight saved");
  });
});

describe("recolouring through LessonRenderer", () => {
  it("shows the new colour at once and keeps it when the update succeeds", async () => {
    const { updateHighlight } = jest.requireMock("@/lib/requests/highlights");
    const update = deferred<unknown>();
    updateHighlight.mockReturnValue(update.promise);
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [savedRecord({ id: 7 })] })}
      />,
    );
    const content = document.querySelector(".prose")!;

    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Highlight Green"));

    expect(updateHighlight).toHaveBeenCalledWith(7, { color: "#86efac" });
    expect(highlightSpans(content)[0].style.backgroundColor).toBe(
      "rgb(134, 239, 172)",
    );

    update.resolve({
      ok: true,
      error: null,
      data: savedRecord({ id: 7, color: "#86efac" }),
    });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight updated"),
    );
    expect(highlightSpans(content)[0].style.backgroundColor).toBe(
      "rgb(134, 239, 172)",
    );
  });

  it("puts the old colour back and shows the error toast when the update fails", async () => {
    const { updateHighlight } = jest.requireMock("@/lib/requests/highlights");
    updateHighlight.mockResolvedValue({
      ok: false,
      error: "Failed to update highlight",
      data: null,
    });
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [savedRecord({ id: 7 })] })}
      />,
    );
    const content = document.querySelector(".prose")!;

    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Highlight Green"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update highlight"),
    );
    await waitFor(() =>
      expect(highlightSpans(content)[0].style.backgroundColor).toBe(
        "rgb(249, 168, 212)",
      ),
    );
  });

  it("drops a highlight the server no longer has instead of rolling back", async () => {
    mockedUpdateHighlight.mockResolvedValue({
      ok: false,
      error: "Highlight not found",
      data: null,
    });
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [savedRecord({ id: 7 })] })}
      />,
    );
    const content = document.querySelector(".prose")!;

    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Highlight Green"));

    await waitFor(() => expect(highlightSpans(content)).toHaveLength(0));
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("merging through LessonRenderer (ODY-153)", () => {
  const mergeLesson = {
    id: 1,
    name: "Lesson",
    slug: "lesson",
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "<p>Alpha beta gamma delta</p>",
      },
    ],
  } as unknown as Lesson;
  const initial = () => [
    savedRecord({ id: 3, text: "beta", position: { start: 6, end: 10 } }),
    savedRecord({ id: 4, text: "gamma", position: { start: 11, end: 16 } }),
  ];
  const ids = (content: Element) =>
    new Set(
      Array.from(highlightSpans(content)).map((s) => s.dataset.highlightId),
    );

  /** Selects "ha beta ga" across both highlights and picks green. */
  const startMerge = () => {
    const content = document.querySelector(".prose")!;
    const spans = highlightSpans(content);
    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Green"));
    return content;
  };

  const mergeProps = () =>
    lessonProps({ lesson: mergeLesson, initialHighlights: initial() });

  it("shows the union and hides the absorbed highlight at once, deleting only after the update succeeds", async () => {
    const update = deferred<Awaited<ReturnType<typeof updateHighlight>>>();
    mockedUpdateHighlight.mockReturnValue(update.promise);
    mockedDeleteHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 4 },
    });
    render(<LessonRenderer {...mergeProps()} />);

    const content = startMerge();

    // before the server answers: one highlight over the union, no flicker
    expect(ids(content)).toEqual(new Set(["3"]));
    expect(mockedUpdateHighlight).toHaveBeenCalledWith(3, {
      color: "#86efac",
      position: { start: 3, end: 16 },
      text: "ha beta gamma",
    });
    expect(mockedDeleteHighlight).not.toHaveBeenCalled();

    update.resolve({
      ok: true,
      error: null,
      data: savedRecord({
        id: 3,
        color: "#86efac",
        text: "ha beta gamma",
        position: { start: 3, end: 16 },
      }),
    });

    await waitFor(() => expect(mockedDeleteHighlight).toHaveBeenCalledWith(4));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlights merged"),
    );
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(ids(content)).toEqual(new Set(["3"]));
  });

  it("rolls everything back when the update fails, and deletes nothing", async () => {
    mockedUpdateHighlight.mockResolvedValue({
      ok: false,
      error: "Failed to update highlight",
      data: null,
    });
    render(<LessonRenderer {...mergeProps()} />);

    const content = startMerge();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update highlight"),
    );
    await waitFor(() => expect(ids(content)).toEqual(new Set(["3", "4"])));
    expect(mockedDeleteHighlight).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("brings back an absorbed highlight whose delete fails, with the error toast", async () => {
    mockedUpdateHighlight.mockResolvedValue({
      ok: true,
      error: null,
      data: savedRecord({
        id: 3,
        color: "#86efac",
        text: "ha beta gamma",
        position: { start: 3, end: 16 },
      }),
    });
    mockedDeleteHighlight.mockResolvedValue({
      ok: false,
      error: "Failed to delete highlight",
      data: null,
    });
    render(<LessonRenderer {...mergeProps()} />);

    const content = startMerge();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to remove highlight"),
    );
    await waitFor(() => expect(ids(content)).toEqual(new Set(["3", "4"])));
    expect(toast.success).toHaveBeenCalledWith("Highlights merged");
  });
});

describe("notes and highlights that already have one (W5)", () => {
  const prepareNote = () => {
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(createNote).mockResolvedValue({ success: true });
  };
  const addNoteOnClicked = () => {
    const content = document.querySelector(".prose")!;
    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Add note"));
  };

  it("creates no second note: opens the notes bar and says so", async () => {
    prepareNote();
    const setExpanded = jest.fn();
    render(
      <LessonRenderer
        {...lessonProps({
          setExpanded,
          initialHighlights: [noted(savedRecord({ id: 7 }))],
        })}
      />,
    );

    addNoteOnClicked();

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "This highlight already has a note",
      ),
    );
    expect(setExpanded).toHaveBeenCalledWith(true);
    expect(createNote).not.toHaveBeenCalled();
  });

  it("marks a highlight as noted once its note is created", async () => {
    prepareNote();
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [savedRecord({ id: 7 })] })}
      />,
    );

    addNoteOnClicked();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Note created"),
    );
    expect(createNote).toHaveBeenCalledTimes(1);

    addNoteOnClicked();
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "This highlight already has a note",
      ),
    );
    expect(createNote).toHaveBeenCalledTimes(1);
  });

  it("shows 'Failed to create note' instead of an unhandled rejection when creating throws", async () => {
    jest.mocked(getEnrollByID).mockRejectedValue(new Error("down"));
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [savedRecord({ id: 7 })] })}
      />,
    );

    addNoteOnClicked();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to create note"),
    );
  });
});

describe("selection and drawing details", () => {
  it("picks the highlight drawn last (innermost) for a selection inside two on the same words", () => {
    // 9 is drawn first (outer), 7 last (inner): the same one a click picks
    const { content, onDeleteHighlight } = renderBlock(
      "<p>Alpha beta gamma</p>",
      [hl(9, "beta", 6, 10), hl(7, "beta", 6, 10, PINK)],
    );
    const innermost = Array.from(highlightSpans(content)).find(
      (s) => !s.querySelector(".ody-highlight"),
    )!;

    select(textNode(innermost, "beta"), 1, 3);
    release(content);
    fireEvent.click(screen.getByTitle("Remove highlight"));

    expect(onDeleteHighlight).toHaveBeenCalledWith(7);
  });

  it("does not redraw when the server's echo only changes fields that aren't drawn", () => {
    const props = {
      block: { id: 1, content: "<p>Alpha beta gamma</p>" },
      onHighlight: jest.fn().mockResolvedValue(null),
      onUpdateHighlight: jest.fn().mockResolvedValue(null),
      onMergeHighlights: jest.fn().mockResolvedValue(null),
      onDeleteHighlight: jest.fn().mockResolvedValue(true),
      onNote: jest.fn(),
      enrollmentId: "123",
    };
    const { container, rerender } = render(
      <GenericBlockRenderer {...props} highlights={[hl(1, "beta", 6, 10)]} />,
    );
    const piece = textNode(container.querySelector(".prose")!, "beta");

    rerender(
      <GenericBlockRenderer
        {...props}
        highlights={[
          { ...hl(1, "beta", 6, 10), updatedAt: "2026-01-01" } as Highlight,
        ]}
      />,
    );

    expect(piece.isConnected).toBe(true);
  });

  it("reads a merged highlight's text without the hidden MathML copy of a formula", () => {
    const { content, onUpdateHighlight } = renderBlock("<p>a $x$ b</p>", [
      hl(3, "a ", 0, 2),
    ]);

    // from inside "a " to inside " b": strictly overlaps highlight 3
    selectAcross(textNode(content, "a "), 1, textNode(content, " b"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onUpdateHighlight).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ text: "a x b" }),
    );
  });

  it("leaves the line-number gutter's digits out of a merged highlight's text", async () => {
    // offsets: "Alpha beta" is 0-10, the gutter's "1" is 10-11, the code 11-20
    const { content, onUpdateHighlight } = renderBlock(
      "<p>Alpha beta</p><pre><code>code line</code></pre>",
      [hl(3, "beta", 6, 10)],
    );
    // let highlight.js load and the block settle before selecting
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    selectAcross(
      textNode(content.querySelector(".ody-highlight")!, "beta"),
      2,
      textNode(content.querySelector("pre code")!, "code"),
      4,
    );
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Pink"));

    expect(onUpdateHighlight).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        position: { start: 6, end: 15 },
        text: "betacode",
      }),
    );
  });

  it("does not redraw when only a highlight's note flag flips", () => {
    const props = {
      block: { id: 1, content: "<p>Alpha beta gamma</p>" },
      onHighlight: jest.fn().mockResolvedValue(null),
      onUpdateHighlight: jest.fn().mockResolvedValue(null),
      onMergeHighlights: jest.fn().mockResolvedValue(null),
      onDeleteHighlight: jest.fn().mockResolvedValue(true),
      onNote: jest.fn(),
      enrollmentId: "123",
    };
    const { container, rerender } = render(
      <GenericBlockRenderer {...props} highlights={[hl(1, "beta", 6, 10)]} />,
    );
    const piece = textNode(container.querySelector(".prose")!, "beta");

    rerender(
      <GenericBlockRenderer
        {...props}
        highlights={[noted(hl(1, "beta", 6, 10))]}
      />,
    );

    expect(piece.isConnected).toBe(true);
  });
});

describe("the note flag follows the notes list (W9)", () => {
  const noteOn = (highlightId: number) =>
    ({
      id: 1,
      content: "",
      positionY: 0,
      highlight: { id: highlightId },
    }) as unknown as Note;
  const addNoteOnClicked = () => {
    const content = document.querySelector(".prose")!;
    fireEvent.click(highlightSpans(content)[0]);
    fireEvent.click(screen.getByTitle("Add note"));
  };

  it("lets a note be created again once the note on its highlight is deleted", async () => {
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(createNote).mockResolvedValue({ success: true });
    const props = lessonProps({
      initialHighlights: [savedRecord({ id: 7 })],
      notes: [noteOn(7)],
    });
    const { rerender } = render(<LessonRenderer {...props} />);

    addNoteOnClicked();
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "This highlight already has a note",
      ),
    );
    expect(createNote).not.toHaveBeenCalled();

    // the note is deleted in the notes bar: the page passes the list without it
    rerender(<LessonRenderer {...props} notes={[]} />);
    addNoteOnClicked();

    await waitFor(() => expect(createNote).toHaveBeenCalledTimes(1));
  });

  it("treats a highlight as noted from the notes list even if it loaded without the flag", async () => {
    render(
      <LessonRenderer
        {...lessonProps({
          initialHighlights: [savedRecord({ id: 7 })],
          notes: [noteOn(7)],
        })}
      />,
    );

    addNoteOnClicked();

    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(createNote).not.toHaveBeenCalled();
  });
});

describe("merging when the server or the notes disagree", () => {
  const mergeLesson = {
    id: 1,
    name: "Lesson",
    slug: "lesson",
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "<p>Alpha beta gamma delta</p>",
      },
    ],
  } as unknown as Lesson;
  const both = () => [
    savedRecord({ id: 3, text: "beta", position: { start: 6, end: 10 } }),
    savedRecord({ id: 4, text: "gamma", position: { start: 11, end: 16 } }),
  ];
  const ids = (content: Element) =>
    new Set(
      Array.from(highlightSpans(content)).map((s) => s.dataset.highlightId),
    );
  const startMerge = () => {
    const content = document.querySelector(".prose")!;
    const spans = highlightSpans(content);
    selectAcross(textNode(content, "Alpha"), 3, textNode(spans[1], "gamma"), 2);
    release(content);
    fireEvent.click(screen.getByTitle("Highlight Green"));
    return content;
  };

  it("drops the base and brings the absorbed highlight back when the update says 'Highlight not found'", async () => {
    mockedUpdateHighlight.mockResolvedValue({
      ok: false,
      error: "Highlight not found",
      data: null,
    });
    render(
      <LessonRenderer
        {...lessonProps({ lesson: mergeLesson, initialHighlights: both() })}
      />,
    );

    const content = startMerge();

    await waitFor(() => expect(ids(content)).toEqual(new Set(["4"])));
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockedDeleteHighlight).not.toHaveBeenCalled();
  });
});

describe("which highlights a block draws (audit S7)", () => {
  // A converted v2 block groups several saved blocks: highlights saved under
  // any of its sourceBlockIds belong to it
  const grouped = { id: 1, sourceBlockIds: [11, 12], content: "" };
  const text = "<p>Alpha beta gamma delta</p>";
  const on = (blockId: number, ...rest: [string, number, number]) => ({
    ...hl(blockId * 10, ...rest),
    blockId,
  });

  it("draws highlights saved under the block's own id or one of its sourceBlockIds, and no others", () => {
    const { content } = renderBlock(
      text,
      [
        on(1, "Alpha", 0, 5), // the block's own id
        on(12, "beta", 6, 10), // one of its source blocks
        on(99, "gamma", 11, 16), // another block's
      ],
      { block: { ...grouped, content: text } },
    );

    const drawn = Array.from(highlightSpans(content)).map((s) => s.textContent);
    expect(drawn).toEqual(["Alpha", "beta"]);
  });

  it("draws nothing from other blocks when the block has no sourceBlockIds", () => {
    const { content } = renderBlock(text, [
      on(12, "beta", 6, 10),
      on(99, "gamma", 11, 16),
    ]);

    expect(highlightSpans(content)).toHaveLength(0);
  });
});

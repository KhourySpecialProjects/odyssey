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
import { createHighlight, deleteHighlight } from "@/lib/requests/highlights";
import { AuthorizedUser, Highlight, Lesson } from "@/types";

jest.mock("@/lib/requests/highlights", () => ({
  createHighlight: jest.fn(),
  updateHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
  getHighlights: jest.fn(),
  getHighlightsByAuthorizedUserAndLesson: jest.fn(),
}));
jest.mock("@/lib/requests/notes", () => ({ createNote: jest.fn() }));
jest.mock("@/lib/requests/enrollment", () => ({ getEnrollByID: jest.fn() }));
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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
  root.querySelectorAll('span[style*="background-color"]');

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
  fireEvent.mouseUp(content);
  fireEvent.mouseDown(screen.getByTitle(`Highlight ${color}`));
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
        onHighlight={jest.fn()}
        onDeleteHighlight={jest.fn()}
        onNote={jest.fn()}
        enrollmentId="123"
        expanded={false}
        setExpanded={jest.fn()}
      />,
    );
    const content = container.querySelector(".prose")!;
    const node = textNode(content, "Alpha");
    select(node, 6, 10);
    fireEvent.mouseUp(content);

    fireEvent.mouseDown(screen.getByTitle("Highlight Pink"));

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
    fireEvent.mouseDown(screen.getByTitle("Remove highlight"));
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

  it("deletes once when two highlights on the same words resolve to one record", async () => {
    mockedDeleteHighlight
      .mockResolvedValueOnce({ ok: true, error: null, data: { id: 7 } })
      .mockResolvedValue({
        ok: false,
        error: "Highlight not found",
        data: null,
      });
    // Same words twice: the drawn spans nest, and both resolve to record 7
    const twin = savedRecord({ id: 9, color: PINK });
    render(
      <LessonRenderer
        {...lessonProps({ initialHighlights: [existing, twin] })}
      />,
    );

    const content = document.querySelector(".prose")!;
    const innermost = Array.from(highlightSpans(content)).find(
      (s) => s.textContent === "beta" && !s.querySelector("span"),
    )!;
    fireEvent.click(innermost);
    fireEvent.mouseDown(screen.getByTitle("Remove highlight"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
    );
    await act(async () => {});
    expect(mockedDeleteHighlight).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
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
    fireEvent.mouseDown(screen.getByTitle("Remove highlight"));

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
    fireEvent.mouseUp(content.querySelector("p")!);

    expect(screen.queryByTitle("Remove highlight")).toBeNull();
    expect(screen.queryByTitle("Highlight Pink")).toBeNull();
  });
});

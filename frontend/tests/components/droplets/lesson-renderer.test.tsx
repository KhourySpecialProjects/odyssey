import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import {
  createHighlight,
  deleteHighlight,
  getHighlightsByAuthorizedUserAndLesson,
  updateHighlight,
} from "@/lib/requests/highlights";
import { createNote } from "@/lib/requests/notes";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { toast } from "sonner";
import { AuthorizedUser, Highlight, Lesson } from "@/types";

jest.mock("@/lib/requests/highlights", () => ({
  createHighlight: jest.fn(),
  updateHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
  getHighlightsByAuthorizedUserAndLesson: jest.fn(),
}));

jest.mock("@/lib/requests/notes", () => ({
  createNote: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollByID: jest.fn(),
}));

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

/** A promise the test settles itself, to look at the page mid-save */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** The nth text node in `root` that contains `text` */
function textNode(root: Element, text: string, nth = 0): Text {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const matches: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.includes(text)) matches.push(node);
  }
  return matches[nth];
}

/** Selects text as a drag, Shift + arrow keys or a long-press would */
function select(
  start: Node,
  startOffset: number,
  end: Node,
  endOffset: number,
) {
  const range = new Range();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  act(() => {
    document.dispatchEvent(new Event("selectionchange"));
  });
}

function selectText(root: Element, text: string) {
  const node = textNode(root, text);
  const at = node.data.indexOf(text);
  select(node, at, node, at + text.length);
}

const pieces = (root: Element, id: number) =>
  Array.from(
    root.querySelectorAll(`.lesson-highlight[data-highlight-id="${id}"]`),
  );

const button = (name: string) => screen.getByRole("button", { name });

describe("LessonRenderer (viewer)", () => {
  // Block 1: "Learn SQL joins today" (SQL 6-9, joins 10-15)
  // Block 2: "Use inner joins", with "inner" in bold
  const lesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "<p>Learn SQL joins today</p>",
      },
      {
        id: 2,
        __component: "droplets.generic",
        content: "<p>Use <strong>inner</strong> joins</p>",
      },
    ],
  } as unknown as Lesson;

  // Crosses the bold text in block 2
  const serverHighlight: Highlight = {
    id: 7,
    text: "Use inner joins",
    color: "#fff300",
    position: { start: 0, end: 15 },
    blockId: 2,
  };

  const props = {
    lesson,
    droplet: { id: 1, name: "Test Droplet", lessons: [], datasets: [] },
    enrollmentId: "5",
    completedLessonIds: [],
    authUser: { id: 1 } as AuthorizedUser,
    initialHighlights: [serverHighlight],
    onUpdate: jest.fn(),
    expanded: false,
    setExpanded: jest.fn(),
  };

  const blocks = (container: HTMLElement) =>
    Array.from(container.querySelectorAll(".prose"));

  const originalRangeRect = Range.prototype.getBoundingClientRect;

  beforeEach(() => {
    jest.clearAllMocks();
    window.getSelection()?.removeAllRanges();
    // JSDOM has no layout: put selections 140px down the page
    Range.prototype.getBoundingClientRect = jest.fn(
      () => ({ top: 140, bottom: 160, left: 0, width: 40 }) as DOMRect,
    );
    jest.mocked(createHighlight).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...serverHighlight, id: 100 },
    });
    jest
      .mocked(updateHighlight)
      .mockResolvedValue({ ok: true, error: null, data: serverHighlight });
    jest
      .mocked(deleteHighlight)
      .mockResolvedValue({ ok: true, error: null, data: { id: 7 } });
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(createNote).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    Range.prototype.getBoundingClientRect = originalRangeRect;
  });

  it("draws the server-provided highlights without fetching on mount", async () => {
    const { container } = render(<LessonRenderer {...props} />);

    expect(pieces(container, 7).map((p) => p.textContent)).toEqual([
      "Use ",
      "inner",
      " joins",
    ]);
    await waitFor(() =>
      expect(screen.getByText("Test Lesson")).toBeInTheDocument(),
    );
    for (const request of [
      getHighlightsByAuthorizedUserAndLesson,
      createHighlight,
      updateHighlight,
      deleteHighlight,
    ]) {
      expect(request).not.toHaveBeenCalled();
    }
  });

  it("keeps the selection and the block's text when the mouse moves over another block", async () => {
    const { container } = render(<LessonRenderer {...props} />);
    const [first, second] = blocks(container);
    const text = textNode(first, "SQL");

    selectText(first, "SQL");
    await screen.findByRole("toolbar");
    // On the way to the toolbar
    fireEvent.mouseOver(second);
    fireEvent.mouseMove(second);
    fireEvent.mouseOver(first);

    expect(textNode(first, "SQL")).toBe(text);
    expect(window.getSelection()!.toString()).toBe("SQL");
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  describe("saving a new highlight", () => {
    it("shows it in the picked colour while it saves, then gives it its real id", async () => {
      const save = deferred<Awaited<ReturnType<typeof createHighlight>>>();
      jest.mocked(createHighlight).mockReturnValue(save.promise);
      const { container } = render(<LessonRenderer {...props} />);
      const [first] = blocks(container);

      selectText(first, "SQL");
      await screen.findByRole("toolbar");
      fireEvent.click(button("Highlight Green"));

      const pending = first.querySelector(".lesson-highlight");
      expect(pending).toHaveTextContent(/^SQL$/);
      expect(pending).toHaveStyle({ backgroundColor: "#86efac" });
      expect(createHighlight).toHaveBeenCalledWith({
        text: "SQL",
        position: { start: 6, end: 9 },
        color: "#86efac",
        blockId: 1,
        lessonId: 1,
      });

      await act(async () =>
        save.resolve({
          ok: true,
          error: null,
          data: { ...serverHighlight, id: 8 },
        }),
      );

      expect(pieces(first, 8)[0]).toHaveTextContent(/^SQL$/);
      expect(pieces(first, 8)[0]).toHaveStyle({ backgroundColor: "#86efac" });
      expect(toast.success).toHaveBeenCalledWith("Highlight saved");
    });

    it("takes it off again and says so when the save fails", async () => {
      const save = deferred<Awaited<ReturnType<typeof createHighlight>>>();
      jest.mocked(createHighlight).mockReturnValue(save.promise);
      const { container } = render(<LessonRenderer {...props} />);
      const [first] = blocks(container);

      selectText(first, "SQL");
      await screen.findByRole("toolbar");
      fireEvent.click(button("Highlight Pink"));
      expect(first.querySelector(".lesson-highlight")).not.toBeNull();

      await act(async () =>
        save.resolve({
          ok: false,
          error: "Failed to save highlight",
          data: null,
        }),
      );

      expect(first.querySelector(".lesson-highlight")).toBeNull();
      expect(toast.error).toHaveBeenCalledWith("Failed to save highlight");
    });
  });

  describe("changing a saved highlight", () => {
    it("removes it straight away and puts it back if the delete fails", async () => {
      const removal = deferred<Awaited<ReturnType<typeof deleteHighlight>>>();
      jest.mocked(deleteHighlight).mockReturnValue(removal.promise);
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(button("Remove highlight"));

      expect(deleteHighlight).toHaveBeenCalledWith(7);
      expect(pieces(container, 7)).toHaveLength(0);

      await act(async () =>
        removal.resolve({
          ok: false,
          error: "Failed to delete highlight",
          data: null,
        }),
      );

      expect(pieces(container, 7)).toHaveLength(3);
      expect(toast.error).toHaveBeenCalledWith("Failed to remove highlight");
    });

    it("recolours a highlight that crosses bold text by updating that record", async () => {
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[1]);
      fireEvent.click(button("Highlight Blue"));

      expect(updateHighlight).toHaveBeenCalledWith(7, { color: "#93c5fd" });
      for (const piece of pieces(container, 7)) {
        expect(piece).toHaveStyle({ backgroundColor: "#93c5fd" });
      }
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlight saved"),
      );
      expect(createHighlight).not.toHaveBeenCalled();
      expect(deleteHighlight).not.toHaveBeenCalled();
    });

    it("puts the old colour back if the recolour fails", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: false,
        error: "Failed to update highlight",
        data: null,
      });
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(button("Highlight Blue"));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to save highlight"),
      );
      expect(pieces(container, 7)[0]).toHaveStyle({
        backgroundColor: "#fff300",
      });
    });
  });

  describe("selecting over saved highlights", () => {
    const sql: Highlight = {
      id: 4,
      text: "SQL",
      color: "#fff300",
      position: { start: 6, end: 9 },
      blockId: 1,
    };
    const joins: Highlight = {
      id: 5,
      text: "joins",
      color: "#fff300",
      position: { start: 10, end: 15 },
      blockId: 1,
    };

    // From inside "SQL" to inside "joins"
    const selectAcross = (root: Element) =>
      select(textNode(root, "SQL"), 1, textNode(root, "joins"), 2);

    it("merges them into one record instead of nesting a new one", async () => {
      const { container } = render(
        <LessonRenderer {...props} initialHighlights={[sql, joins]} />,
      );
      const [first] = blocks(container);

      selectAcross(first);
      await screen.findByRole("toolbar");
      fireEvent.click(button("Highlight Blue"));

      expect(updateHighlight).toHaveBeenCalledWith(4, {
        color: "#93c5fd",
        position: { start: 6, end: 15 },
        text: "SQL joins",
      });
      await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(5));
      expect(createHighlight).not.toHaveBeenCalled();
      expect(
        pieces(first, 4)
          .map((p) => p.textContent)
          .join(""),
      ).toBe("SQL joins");
      expect(pieces(first, 5)).toHaveLength(0);
    });

    it("won't merge two highlights that each have a note", async () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          initialHighlights={[
            { ...sql, note: { id: 1 } },
            { ...joins, note: { id: 2 } },
          ]}
        />,
      );
      const [first] = blocks(container);

      selectAcross(first);
      await screen.findByRole("toolbar");
      fireEvent.click(button("Highlight Blue"));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(updateHighlight).not.toHaveBeenCalled();
      expect(deleteHighlight).not.toHaveBeenCalled();
      expect(pieces(first, 4)).toHaveLength(1);
      expect(pieces(first, 5)).toHaveLength(1);
    });
  });

  describe("adding a note", () => {
    it("links the note to the highlight it just created", async () => {
      jest.mocked(createHighlight).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...serverHighlight, id: 8 },
      });
      const { container } = render(<LessonRenderer {...props} />);
      const [first] = blocks(container);

      selectText(first, "SQL");
      await screen.findByRole("toolbar");
      fireEvent.click(button("Add note"));

      await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
      expect(props.setExpanded).toHaveBeenCalledWith(true);
      expect(createNote).toHaveBeenCalledWith(
        lesson,
        { id: "5" },
        140,
        1,
        expect.objectContaining({ id: 8, text: "SQL" }),
      );
      expect(toast.success).toHaveBeenCalledWith("Note created");
      expect(toast.success).not.toHaveBeenCalledWith("Highlight saved");
    });

    it("adds no note when the highlight couldn't be saved", async () => {
      jest.mocked(createHighlight).mockResolvedValue({
        ok: false,
        error: "Failed to save highlight",
        data: null,
      });
      const { container } = render(<LessonRenderer {...props} />);
      const [first] = blocks(container);

      selectText(first, "SQL");
      await screen.findByRole("toolbar");
      fireEvent.click(button("Add note"));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to save highlight"),
      );
      expect(createNote).not.toHaveBeenCalled();
    });

    it("links a note to an existing highlight without saving another", async () => {
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[2]);
      fireEvent.click(button("Add note"));

      await waitFor(() => expect(createNote).toHaveBeenCalledTimes(1));
      expect(jest.mocked(createNote).mock.calls[0][4]).toMatchObject({
        id: 7,
      });
      expect(createHighlight).not.toHaveBeenCalled();
    });
  });

  it("shows the enrollment gate instead of the lesson when not enrolled", () => {
    const { container } = render(
      <LessonRenderer {...props} enrollmentId={undefined} />,
    );

    expect(screen.getByText("Enrollment Required")).toBeInTheDocument();
    expect(container.querySelector(".lesson-highlight")).toBeNull();
  });
});

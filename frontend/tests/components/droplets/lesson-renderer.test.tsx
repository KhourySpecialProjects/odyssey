import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import {
  createHighlight,
  deleteHighlight,
  getHighlightsByAuthorizedUserAndLesson,
  updateHighlight,
} from "@/lib/requests/highlights";
import { createNote } from "@/lib/requests/notes";
import { blockNoteIdToNumber } from "@/lib/blocknote/convert-blocks";
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
// Like the real viewer, its editor sets the region's reader only once loaded
jest.mock("@/components/draft/lesson/code-block-viewer", () => {
  const { useEffect, useRef } = jest.requireActual("react");
  const { regionProps, setRegionReader } = jest.requireActual(
    "@/lib/highlight-regions",
  );
  return {
    CodeBlockViewer: ({
      code,
      highlightIds,
    }: {
      code: string;
      highlightIds: number[];
    }) => {
      const ref = useRef(null);
      useEffect(() => {
        const timer = setTimeout(() => {
          setRegionReader(ref.current!, {
            offsetOf: () => 0,
            text: () => code,
            slice: (start: number, end: number) => code.slice(start, end),
          });
        }, 0);
        return () => clearTimeout(timer);
      }, [code]);
      return <div ref={ref} {...regionProps(highlightIds)} />;
    },
  };
});
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
        context: { quote: "SQL", prefix: "Learn ", suffix: " joins today" },
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

    it("removes a highlight whose state was replaced by a recolour while it saves", async () => {
      const recolour = deferred<Awaited<ReturnType<typeof updateHighlight>>>();
      jest.mocked(updateHighlight).mockReturnValue(recolour.promise);
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(button("Highlight Blue"));
      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(button("Remove highlight"));

      expect(pieces(container, 7)).toHaveLength(0);
      await act(async () =>
        recolour.resolve({ ok: true, error: null, data: serverHighlight }),
      );
      expect(pieces(container, 7)).toHaveLength(0);
    });

    it("leaves one copy, not two, when a delete fails after a recolour", async () => {
      const removal = deferred<Awaited<ReturnType<typeof deleteHighlight>>>();
      jest.mocked(deleteHighlight).mockReturnValue(removal.promise);
      const { container } = render(<LessonRenderer {...props} />);

      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(button("Remove highlight"));
      await act(async () =>
        removal.resolve({ ok: false, error: "Failed", data: null }),
      );

      expect(pieces(container, 7)).toHaveLength(3);
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
        blockId: 1,
        context: { quote: "SQL joins", prefix: "Learn ", suffix: " today" },
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

  it("saves part of a highlight as a new highlight inside it", async () => {
    const whole: Highlight = {
      id: 4,
      text: "Learn SQL joins today",
      color: "#fff300",
      position: { start: 0, end: 21 },
      blockId: 1,
    };
    const { container } = render(
      <LessonRenderer {...props} initialHighlights={[whole]} />,
    );
    const [first] = blocks(container);

    selectText(first, "SQL");
    await screen.findByRole("toolbar");
    fireEvent.click(button("Highlight Blue"));

    expect(createHighlight).toHaveBeenCalledWith({
      text: "SQL",
      position: { start: 6, end: 9 },
      color: "#93c5fd",
      blockId: 1,
      lessonId: 1,
      context: { quote: "SQL", prefix: "Learn ", suffix: " joins today" },
    });
    await waitFor(() => expect(pieces(first, 100)).toHaveLength(1));
    expect(pieces(first, 4)[0]).toContainElement(
      pieces(first, 100)[0] as HTMLElement,
    );
    expect(updateHighlight).not.toHaveBeenCalled();
    expect(deleteHighlight).not.toHaveBeenCalled();
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

  describe("across blocks", () => {
    // From "joins" in block 1 to the end of "inner" in block 2
    const selectAcrossBlocks = (container: HTMLElement) => {
      const [first, second] = blocks(container);
      const start = textNode(first, "joins");
      const end = textNode(second, "inner");
      select(
        start,
        start.data.indexOf("joins"),
        end,
        end.data.indexOf("inner") + 5,
      );
    };
    const joinsToday: Highlight = {
      id: 4,
      text: "joins today",
      color: "#86efac",
      position: { start: 10, end: 21 },
      blockId: 1,
      context: { quote: "joins today", prefix: "Learn SQL ", suffix: "" },
    };
    const useInner: Highlight = {
      id: 5,
      text: "Use inner",
      color: "#86efac",
      position: { start: 0, end: 9 },
      blockId: 2,
      context: { quote: "Use inner", prefix: "", suffix: " joins" },
    };

    it("saves a highlight in each block the selection covers, and says so once", async () => {
      jest
        .mocked(createHighlight)
        .mockResolvedValueOnce({ ok: true, error: null, data: joinsToday })
        .mockResolvedValueOnce({ ok: true, error: null, data: useInner });
      const { container } = render(
        <LessonRenderer {...props} initialHighlights={[]} />,
      );

      selectAcrossBlocks(container);
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Green" }),
      );

      const { id: _, ...first } = joinsToday;
      const { id: __, ...second } = useInner;
      expect(createHighlight).toHaveBeenCalledWith({ ...first, lessonId: 1 });
      expect(createHighlight).toHaveBeenCalledWith({ ...second, lessonId: 1 });
      await waitFor(() => expect(pieces(container, 5)).toHaveLength(2));
      expect(pieces(container, 4)[0]).toHaveTextContent(/^joins today$/);
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Highlight saved");
    });

    it("saves only a block's own text when the selection starts above the blocks", async () => {
      const { container } = render(
        <LessonRenderer {...props} initialHighlights={[]} />,
      );
      const [first] = blocks(container);

      // From the lesson's title to the end of "SQL"
      select(
        screen.getByText("Test Lesson").firstChild!,
        0,
        textNode(first, "SQL"),
        9,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Green" }),
      );

      expect(createHighlight).toHaveBeenCalledTimes(1);
      expect(createHighlight).toHaveBeenCalledWith({
        text: "Learn SQL",
        position: { start: 0, end: 9 },
        color: "#86efac",
        blockId: 1,
        lessonId: 1,
        context: { quote: "Learn SQL", prefix: "", suffix: " joins today" },
      });
    });

    it("shows the toolbar in the block where the selection ends", async () => {
      const { container } = render(
        <LessonRenderer {...props} initialHighlights={[]} />,
      );
      const [, second] = blocks(container);

      selectAcrossBlocks(container);

      const toolbar = await screen.findByRole("toolbar");
      expect(second.parentElement!.parentElement).toContainElement(toolbar);
    });

    it("removes them together when the same text is selected again", async () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          initialHighlights={[joinsToday, useInner]}
        />,
      );

      selectAcrossBlocks(container);
      fireEvent.click(
        await screen.findByRole("button", { name: "Remove highlight" }),
      );

      expect(deleteHighlight).toHaveBeenCalledWith(4);
      expect(deleteHighlight).toHaveBeenCalledWith(5);
      expect(container.querySelector(".lesson-highlight")).toBeNull();
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
      );
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe("other kinds of block", () => {
    // A Classic lesson's callout with the same id as the generic block 1
    const callout = {
      id: 1,
      __component: "droplets.callout",
      content: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Mind the " },
            { type: "text", text: "ON", code: true },
            { type: "text", text: " clause" },
          ],
        },
      ],
    };
    const calloutBlockId = blockNoteIdToNumber("droplets.callout:1");
    const expandable = {
      id: 1,
      __component: "droplets.expandable",
      title: "Why?",
      content: "<p>Rows pair up by their keys.</p>",
    };
    const withBlocks = (...extra: object[]) =>
      ({
        ...lesson,
        blocks: [...(lesson.blocks as object[]), ...extra],
      }) as unknown as Lesson;

    it("draws and saves a callout's highlights, apart from a block with the same id", async () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          lesson={withBlocks(callout)}
          initialHighlights={[
            {
              id: 6,
              text: "Mind",
              color: "#fff300",
              position: { start: 0, end: 4 },
              blockId: calloutBlockId,
            },
          ]}
        />,
      );
      const calloutText = screen.getByText(
        (_, element) => element?.textContent === "Mind the ON clause",
        { selector: "p" },
      );

      expect(pieces(calloutText, 6)[0]).toHaveTextContent(/^Mind$/);
      expect(pieces(blocks(container)[0], 6)).toHaveLength(0);

      selectText(calloutText, "clause");
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Blue" }),
      );

      expect(createHighlight).toHaveBeenCalledWith({
        text: "clause",
        position: { start: 12, end: 18 },
        color: "#93c5fd",
        blockId: calloutBlockId,
        lessonId: 1,
        context: {
          quote: "clause",
          prefix: "Mind the ON ",
          suffix: "",
        },
      });
    });

    it("saves a highlight in an expandable once it's open", async () => {
      render(<LessonRenderer {...props} lesson={withBlocks(expandable)} />);

      fireEvent.click(screen.getByRole("button", { name: "Why?" }));
      selectText(screen.getByText(/Rows pair up/), "keys");
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Blue" }),
      );

      expect(createHighlight).toHaveBeenCalledWith({
        text: "keys",
        position: { start: 22, end: 26 },
        color: "#93c5fd",
        blockId: blockNoteIdToNumber("droplets.expandable:1"),
        lessonId: 1,
        context: {
          quote: "keys",
          prefix: "Rows pair up by their ",
          suffix: ".",
        },
      });
    });
  });

  it("shows the enrollment gate instead of the lesson when not enrolled", () => {
    const { container } = render(
      <LessonRenderer {...props} enrollmentId={undefined} />,
    );

    expect(screen.getByText("Enrollment Required")).toBeInTheDocument();
    expect(container.querySelector(".lesson-highlight")).toBeNull();
  });

  describe("after the author edits the lesson (ODY-198)", () => {
    // Saved on "SQL" when block 1 read "Learn SQL joins today"
    const sqlHighlight: Highlight = {
      id: 4,
      text: "SQL",
      color: "#fff300",
      position: { start: 6, end: 9 },
      blockId: 1,
      context: { quote: "SQL", prefix: "Learn ", suffix: " joins today" },
    };

    /** The lesson with block 1's content replaced */
    const editedLesson = (content: string) =>
      ({
        ...lesson,
        blocks: [{ ...lesson.blocks[0], content }, lesson.blocks[1]],
      }) as Lesson;

    const notice = () =>
      screen.queryByRole("region", {
        name: "Highlights no longer in this lesson",
      });

    it("follows a highlight's text when a paragraph is added above it", () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          lesson={editedLesson("<p>Intro.</p><p>Learn SQL joins today</p>")}
          initialHighlights={[sqlHighlight]}
        />,
      );

      expect(pieces(container, 4).map((p) => p.textContent)).toEqual(["SQL"]);
      expect(notice()).not.toBeInTheDocument();
    });

    it("draws over the new words when the highlighted words were edited, and says what they were", () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          lesson={editedLesson("<p>Learn Postgres joins today</p>")}
          initialHighlights={[sqlHighlight]}
        />,
      );

      const [piece] = pieces(container, 4);
      expect(piece).toHaveTextContent(/^Postgres$/);
      expect(piece).toHaveAttribute("data-highlight-edited");
      expect(piece).toHaveAttribute(
        "title",
        expect.stringContaining("You highlighted: “SQL”"),
      );
    });

    it("re-finds an older highlight after a Classic-editor save gives its block a new id", () => {
      const { container } = render(
        <LessonRenderer
          {...props}
          initialHighlights={[{ ...serverHighlight, blockId: 99 }]}
        />,
      );

      expect(
        pieces(container, 7)
          .map((p) => p.textContent)
          .join(""),
      ).toBe("Use inner joins");
    });

    describe("when the highlighted text was deleted", () => {
      const renderDeleted = (highlight: Highlight = sqlHighlight) =>
        render(
          <LessonRenderer
            {...props}
            lesson={editedLesson("<p>Learn joins today</p>")}
            initialHighlights={[highlight]}
          />,
        );

      it("lists it above the lesson instead of drawing it on other words", () => {
        const { container } = renderDeleted({
          ...sqlHighlight,
          note: { id: 3 },
        });

        expect(pieces(container, 4)).toHaveLength(0);
        expect(notice()).toHaveTextContent(
          "1 of your highlights is on text that's no longer here.",
        );
        fireEvent.click(button("Show"));
        const item = within(notice()!).getByRole("listitem");
        expect(item).toHaveTextContent("“SQL”");
        expect(item).toHaveTextContent("Has a note");
        expect(deleteHighlight).not.toHaveBeenCalled();
      });

      it("removes it when the reader chooses to", async () => {
        renderDeleted();

        fireEvent.click(button("Show"));
        fireEvent.click(button("Remove"));

        await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(4));
        expect(notice()).not.toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith("Highlight removed");
      });

      it("moves it onto the text the reader selects, keeping its colour", async () => {
        const { container } = renderDeleted();
        const [first] = blocks(container);

        fireEvent.click(button("Show"));
        fireEvent.click(button("Move to new text"));
        expect(notice()).toHaveTextContent(
          "Select the text this highlight should move to",
        );
        selectText(first, "joins");
        fireEvent.click(
          await screen.findByRole("button", {
            name: "Move highlight here",
          }),
        );

        expect(updateHighlight).toHaveBeenCalledWith(4, {
          text: "joins",
          position: { start: 6, end: 11 },
          blockId: 1,
          context: { quote: "joins", prefix: "Learn ", suffix: " today" },
        });
        expect(createHighlight).not.toHaveBeenCalled();
        expect(pieces(first, 4).map((p) => p.textContent)).toEqual(["joins"]);
        expect(pieces(first, 4)[0]).toHaveStyle({ backgroundColor: "#fff300" });
        expect(notice()).not.toBeInTheDocument();
        await waitFor(() =>
          expect(toast.success).toHaveBeenCalledWith("Highlight moved"),
        );
      });

      it("puts it back on the list if the move fails", async () => {
        jest.mocked(updateHighlight).mockResolvedValue({
          ok: false,
          error: "Failed to update highlight",
          data: null,
        });
        const { container } = renderDeleted();
        const [first] = blocks(container);

        fireEvent.click(button("Show"));
        fireEvent.click(button("Move to new text"));
        selectText(first, "joins");
        fireEvent.click(
          await screen.findByRole("button", {
            name: "Move highlight here",
          }),
        );

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith("Failed to move highlight"),
        );
        expect(pieces(first, 4)).toHaveLength(0);
        expect(notice()).toBeInTheDocument();
      });

      it("offers the usual highlight colours again once the move is cancelled", async () => {
        const { container } = renderDeleted();

        fireEvent.click(button("Show"));
        fireEvent.click(button("Move to new text"));
        fireEvent.click(button("Cancel"));
        selectText(blocks(container)[0], "joins");

        expect(
          await screen.findByRole("button", { name: "Highlight Green" }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Move highlight here" }),
        ).not.toBeInTheDocument();
      });

      it("doesn't open the recolour toolbar when a saved highlight is clicked", async () => {
        const { container } = render(
          <LessonRenderer
            {...props}
            lesson={editedLesson("<p>Learn joins today</p>")}
            initialHighlights={[sqlHighlight, serverHighlight]}
          />,
        );

        fireEvent.click(button("Show"));
        fireEvent.click(button("Move to new text"));
        // Block 2's saved highlight, drawn while the other one is moving
        fireEvent.click(pieces(container, 7)[0]);

        expect(pieces(container, 7).length).toBeGreaterThan(0);
        expect(
          screen.queryByRole("toolbar", { name: "Highlight text" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Remove highlight" }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("highlights on other kinds of block (ODY-198)", () => {
    const codeBlock = {
      id: 3,
      __component: "droplets.code-block",
      language: "sql",
      code: "SELECT 1;",
    };
    const codeHighlight: Highlight = {
      id: 8,
      text: "SELECT",
      color: "#fff300",
      position: { start: 0, end: 6 },
      blockId: blockNoteIdToNumber("droplets.code-block:3"),
      context: { quote: "SELECT", prefix: "", suffix: " 1;" },
    };

    it("doesn't list a code block's highlight as deleted, though its editor loads late", async () => {
      render(
        <LessonRenderer
          {...props}
          lesson={
            {
              ...lesson,
              blocks: [...(lesson.blocks as object[]), codeBlock],
            } as unknown as Lesson
          }
          initialHighlights={[codeHighlight]}
        />,
      );

      // It's placed once the editor's text is known
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(
        screen.queryByRole("region", {
          name: "Highlights no longer in this lesson",
        }),
      ).not.toBeInTheDocument();
    });
  });
});

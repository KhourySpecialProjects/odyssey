import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";
import { HighlightLayer } from "@/components/droplets/lessons/highlight-layer";
import { LazyCodeEditor } from "@/components/ui/lazy-code-editor";
import { Highlight } from "@/types";

jest.mock("@/lib/code-execution", () => ({
  executeCode: jest.fn(),
}));

// An editor that shows its code after a line number, and hands over a view
// whose positions are offsets in the code
jest.mock("@/components/ui/lazy-code-editor", () => ({
  LazyCodeEditor: jest.fn(),
}));

function FakeEditor({
  value,
  onCreateEditor,
}: React.ComponentProps<typeof LazyCodeEditor>) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const contentDOM = contentRef.current!;
    onCreateEditor?.({
      contentDOM,
      posAtDOM: (_node: Node, offset: number) => offset,
      state: {
        doc: {
          length: value.length,
          toString: () => value,
          sliceString: (from: number, to: number) => value.slice(from, to),
        },
      },
    } as unknown as EditorView);
  }, [value, onCreateEditor]);
  return (
    <div>
      <div className="cm-gutters">1</div>
      <div ref={contentRef} className="cm-content">
        {value}
      </div>
    </div>
  );
}

const editorProps = () => jest.mocked(LazyCodeEditor).mock.lastCall![0];

describe("CodeBlockViewer highlights", () => {
  const code = 'print("hello")';
  const highlight = (id: number, blockId: number): Highlight => ({
    id,
    text: "hello",
    color: "#86efac",
    position: { start: 7, end: 12 },
    blockId,
  });
  const onHighlight = jest.fn().mockResolvedValue([]);

  const renderInLesson = (
    viewer: Partial<React.ComponentProps<typeof CodeBlockViewer>>,
  ) =>
    render(
      <HighlightLayer
        highlights={[highlight(1, 40), highlight(2, 41)]}
        canHighlight
        onHighlight={onHighlight}
        onRecolorHighlight={jest.fn()}
        onDeleteHighlight={jest.fn()}
        onNote={jest.fn()}
      >
        <div className="relative">
          <CodeBlockViewer
            language="python"
            code={code}
            editable={false}
            runnable={false}
            highlightIds={[40]}
            {...viewer}
          />
        </div>
      </HighlightLayer>,
    );

  const originalRangeRect = Range.prototype.getBoundingClientRect;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(LazyCodeEditor).mockImplementation(FakeEditor);
    Range.prototype.getBoundingClientRect = jest.fn(
      () => ({ top: 10, bottom: 20, left: 0, width: 40 }) as DOMRect,
    );
  });

  afterEach(() => {
    Range.prototype.getBoundingClientRect = originalRangeRect;
  });

  it("draws its own highlights as marks in the editor", () => {
    renderInLesson({});

    expect(editorProps().marks).toEqual([
      expect.objectContaining({
        from: 7,
        to: 12,
        attributes: expect.objectContaining({ "data-highlight-id": "1" }),
      }),
    ]);
  });

  it("saves a selection at its place in the code, not counting line numbers", async () => {
    const { container } = renderInLesson({});
    const text = container.querySelector(".cm-content")!.firstChild!;

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    act(() => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Highlight Blue" }),
    );

    expect(onHighlight).toHaveBeenCalledWith([
      {
        draft: {
          text: "print",
          position: { start: 0, end: 5 },
          color: "#93c5fd",
          blockId: 40,
          context: { quote: "print", prefix: "", suffix: '("hello")' },
        },
      },
    ]);
  });

  it("isn't highlighted when the reader can edit it, as a click starts editing", () => {
    const { container } = renderInLesson({ editable: true });

    expect(editorProps().marks).toEqual([]);
    expect(container.querySelector("[data-highlight-region]")).toBeNull();
  });
});

import type { EditorView } from "@codemirror/view";
import {
  codeEditorReader,
  codeMarks,
  drawHighlights,
  regionReader,
} from "@/lib/highlight-regions";
import { Highlight } from "@/types";

const highlight = (
  id: number,
  start: number,
  end: number,
  color: Highlight["color"] = "#fff300",
): Highlight => ({ id, text: "", color, blockId: 1, position: { start, end } });

function region(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  document.body.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("drawHighlights", () => {
  it("takes the old highlights out before drawing, leaving the text as it was", () => {
    // "Call onChange to update": "onChange" (5-13) is inline code
    const html = "<p>Call <code>onChange</code> to update</p>";
    const element = region(html);

    drawHighlights(element, [highlight(1, 0, 14), highlight(2, 5, 9)]);
    expect(element.querySelectorAll(".lesson-highlight")).not.toHaveLength(0);

    drawHighlights(element, [highlight(3, 14, 16, "#93c5fd")]);

    const drawn = element.querySelectorAll(".lesson-highlight");
    expect(Array.from(drawn).map((piece) => piece.textContent)).toEqual(["to"]);
    expect(drawn[0]).toHaveStyle({ backgroundColor: "#93c5fd" });
    // The inline code the first one painted whole is plain again, with the
    // second one's piece inside it gone
    expect(element.querySelector("code")!.outerHTML).toBe(
      "<code>onChange</code>",
    );

    // With none left, no text node is left split either
    drawHighlights(element, []);
    expect(element.innerHTML).toBe(html);
    expect(element.querySelector("p")!.childNodes).toHaveLength(3);
  });
});

describe("regionReader", () => {
  it("reads offsets in the region's text, and text with a space between cells and paragraphs", () => {
    const element = region(
      "<table><tr><td>Join</td><td>Keeps</td></tr></table><p>Inner <b>rows</b></p>",
    );
    const reader = regionReader(element);
    const keeps = element.querySelectorAll("td")[1].firstChild!;

    expect(reader.offsetOf(keeps, 2)).toBe(6);
    expect(reader.text()).toBe("JoinKeepsInner rows");
    expect(reader.slice(2, 19)).toBe("in Keeps Inner rows");
  });
});

describe("codeEditorReader", () => {
  // A stand-in for a CodeMirror view: its content, after its line numbers
  function fakeView(code: string) {
    const editor = region(
      '<div class="cm-gutters">1</div><div class="cm-content"><div class="cm-line"></div></div>',
    );
    const contentDOM = editor.querySelector<HTMLElement>(".cm-content")!;
    contentDOM.firstElementChild!.textContent = code;
    const after = document.createElement("p");
    editor.after(after);
    const view = {
      contentDOM,
      posAtDOM: jest.fn((_node: Node, offset: number) => offset),
      state: {
        doc: {
          length: code.length,
          toString: () => code,
          sliceString: (from: number, to: number) => code.slice(from, to),
        },
      },
    } as unknown as EditorView;
    return { view, editor, after };
  }

  it("reads positions in the code, not the DOM with its line numbers", () => {
    const { view, editor, after } = fakeView("x = 1\ny = 2");
    const reader = codeEditorReader(view);

    expect(reader.offsetOf(view.contentDOM.firstChild!.firstChild!, 3)).toBe(3);
    // The line numbers come before the code, and anything after it is after
    expect(reader.offsetOf(editor.querySelector(".cm-gutters")!, 0)).toBe(0);
    expect(reader.offsetOf(after, 0)).toBe(11);
    expect(reader.text()).toBe("x = 1\ny = 2");
    expect(reader.slice(4, 9)).toBe("1\ny =");
  });
});

describe("codeMarks", () => {
  it("marks each highlight outer first, without whitespace at its ends, inside the code", () => {
    const code = "def f():\n    return 1";

    const marks = codeMarks(
      [
        highlight(2, 13, 19, "#93c5fd"),
        highlight(1, 8, 40),
        highlight(3, 0, 0),
      ],
      code,
    );

    expect(marks.map(({ from, to }) => [from, to])).toEqual([
      [13, 21],
      [13, 19],
    ]);
    expect(marks[0]).toMatchObject({
      className: "lesson-highlight",
      attributes: { "data-highlight-id": "1" },
    });
    expect(marks[1].attributes.style).toContain("background-color: #93c5fd");
  });
});

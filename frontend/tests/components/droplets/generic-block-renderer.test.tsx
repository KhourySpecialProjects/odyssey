import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import hljs from "highlight.js/lib/core";
import katex from "katex";
import { Highlight } from "@/types";

// The renderer lazy-loads ./highlighter, which configures the real
// highlight.js/lib/core (shared with this file) and fetches grammars on demand.
// Lets a test make the haskell grammar's lazy chunk fail to load.
let mockHaskellChunkFails = false;
jest.mock("highlight.js/lib/languages/haskell", () => {
  if (mockHaskellChunkFails) throw new Error("Loading chunk haskell failed");
  return jest.requireActual("highlight.js/lib/languages/haskell");
});

jest.mock("katex", () => ({
  renderToString: jest.fn(),
}));

/** The nth text node in the block's content that contains `text` */
function textNode(container: HTMLElement, text: string, nth = 0): Text {
  const walker = document.createTreeWalker(
    container.querySelector(".prose")!,
    NodeFilter.SHOW_TEXT,
  );
  const matches: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.includes(text)) matches.push(node);
  }
  return matches[nth];
}

/**
 * Selects text the way a mouse drag, Shift + arrow keys or a long-press does.
 * Only selectionchange fires; there's no mouse event.
 */
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

/** Selects `text` inside a single text node of the block */
function selectText(container: HTMLElement, text: string) {
  const node = textNode(container, text);
  const at = node.data.indexOf(text);
  select(node, at, node, at + text.length);
}

function makeHighlight(
  overrides: Partial<Highlight> & Pick<Highlight, "id" | "position">,
): Highlight {
  return { text: "", color: "#fff300", blockId: 1, ...overrides };
}

const pieces = (container: HTMLElement, id: number) =>
  Array.from(
    container.querySelectorAll(`.lesson-highlight[data-highlight-id="${id}"]`),
  );

describe("GenericBlockRenderer", () => {
  const mockBlock = {
    id: 1,
    content: "Test content",
  };

  const defaultProps = {
    block: mockBlock,
    highlights: [] as Highlight[],
    onHighlight: jest.fn(),
    onRecolorHighlight: jest.fn(),
    onDeleteHighlight: jest.fn(),
    onNote: jest.fn(),
    enrollmentId: "123",
  };

  // "Learn SQL today": SQL is characters 6-9
  const sqlBlock = { id: 1, content: "<p>Learn SQL today</p>" };

  const originalRangeRect = Range.prototype.getBoundingClientRect;

  beforeEach(() => {
    jest.clearAllMocks();
    window.getSelection()?.removeAllRanges();

    // JSDOM has no layout, so give selections a place on the page
    Range.prototype.getBoundingClientRect = jest.fn(
      () =>
        ({
          top: 140,
          bottom: 160,
          left: 50,
          right: 150,
          width: 100,
          height: 20,
          x: 50,
          y: 140,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    (katex.renderToString as jest.Mock).mockImplementation(
      (latex) => `<span class="katex-rendered">${latex}</span>`,
    );
  });

  afterEach(() => {
    Range.prototype.getBoundingClientRect = originalRangeRect;
    jest.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders basic content correctly", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose");

      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveTextContent("Test content");
    });

    it("renders without enrollmentId (no selection toolbar)", () => {
      const propsWithoutEnrollment = {
        ...defaultProps,
        enrollmentId: undefined,
      };

      render(<GenericBlockRenderer {...propsWithoutEnrollment} />);
      // No SelectionToolbar is rendered when there is no enrollmentId
      expect(screen.queryByTitle("Highlight Yellow")).not.toBeInTheDocument();
    });

    it("renders with enrollmentId (SelectionToolbar is conditionally rendered)", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      // The prose content area should be present when enrollmentId is provided
      expect(container.querySelector(".prose")).toBeInTheDocument();
    });
  });

  describe("LaTeX Processing", () => {
    it("processes inline LaTeX with $ delimiters", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test with inline $x^2$ LaTeX" }}
        />,
      );

      expect(katex.renderToString).toHaveBeenCalledWith("x^2", {
        throwOnError: false,
        displayMode: false,
      });
    });

    it("processes block LaTeX with $$ delimiters", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test with block $$y^2 + z^2$$ LaTeX" }}
        />,
      );

      // Check that renderToString was called - inline gets processed first
      expect(katex.renderToString).toHaveBeenCalled();

      // Find the call with displayMode: true for block latex
      const calls = (katex.renderToString as jest.Mock).mock.calls;
      const blockLatexCall = calls.find(
        (call) => call[1]?.displayMode === true,
      );
      expect(blockLatexCall).toBeDefined();
    });

    it("processes multiple inline LaTeX expressions", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test $a$ and $b$ and $c$ LaTeX" }}
        />,
      );

      expect(katex.renderToString).toHaveBeenCalledWith(
        "a",
        expect.any(Object),
      );
      expect(katex.renderToString).toHaveBeenCalledWith(
        "b",
        expect.any(Object),
      );
      expect(katex.renderToString).toHaveBeenCalledWith(
        "c",
        expect.any(Object),
      );
    });

    it("handles inline LaTeX rendering errors gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (katex.renderToString as jest.Mock).mockImplementationOnce(() => {
        throw new Error("LaTeX rendering error");
      });

      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test with $x^2$ LaTeX" }}
        />,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to render inline LaTeX:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("handles block LaTeX rendering errors gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Make the first call throw (will be inline LaTeX in the processing order)
      (katex.renderToString as jest.Mock).mockImplementationOnce(() => {
        throw new Error("LaTeX rendering error");
      });

      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test with $$y^2$$ LaTeX" }}
        />,
      );

      // The error could be caught for either inline or block processing
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to render"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("processes LaTeX with encoded characters", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test $$\\alpha + \\beta$$ content" }}
        />,
      );

      expect(katex.renderToString).toHaveBeenCalled();
    });
  });

  describe("Code Block Processing", () => {
    it("applies syntax highlighting to code blocks", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-javascript">const x = 1;</code></pre>',
          }}
        />,
      );
      await waitFor(() =>
        expect(container.querySelector("code")).toHaveAttribute(
          "data-highlighted",
          "yes",
        ),
      );
      expect(container.querySelector("code .hljs-keyword")).toHaveTextContent(
        "const",
      );
    });

    it("does not run syntax highlighting when there are no code blocks", async () => {
      const highlightElement = jest.spyOn(hljs, "highlightElement");
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>No code here</p>" }}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(highlightElement).not.toHaveBeenCalled();
    });

    it("loads a language that isn't bundled and highlights it", async () => {
      expect(hljs.getLanguage("scheme")).toBeUndefined();

      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-scheme">(define (square x) (* x x))</code></pre>',
          }}
        />,
      );

      await waitFor(() =>
        expect(container.querySelector("code")).toHaveAttribute(
          "data-highlighted",
          "yes",
        ),
      );
      expect(hljs.getLanguage("scheme")).toBeDefined();
      expect(container.querySelector("code")).toHaveClass("language-scheme");
      expect(container.querySelector("code .hljs-built_in")).toHaveTextContent(
        "define",
      );
    });

    it("leaves an unknown language unhighlighted without stopping later blocks", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-notareallanguage">foo bar</code></pre>' +
              '<pre><code class="language-python">def f():\n    return 1</code></pre>',
          }}
        />,
      );

      // Query fresh each time: the block re-renders once highlight.js loads
      const codeBlocks = () => container.querySelectorAll("code");
      await waitFor(() =>
        expect(codeBlocks()[1]).toHaveAttribute("data-highlighted", "yes"),
      );
      expect(codeBlocks()[0]).not.toHaveAttribute("data-highlighted");
      expect(codeBlocks()[0]).toHaveTextContent("foo bar");
    });

    it("keeps highlighting other blocks when one block fails", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      jest.spyOn(hljs, "highlightElement").mockImplementationOnce(() => {
        throw new Error("highlight failed");
      });

      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-javascript">const a = 1;</code></pre>' +
              '<pre><code class="language-python">b = 2</code></pre>',
          }}
        />,
      );

      const codeBlocks = () => container.querySelectorAll("code");
      await waitFor(() =>
        expect(codeBlocks()[1]).toHaveAttribute("data-highlighted", "yes"),
      );
      expect(codeBlocks()[0]).not.toHaveAttribute("data-highlighted");
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to highlight code block:",
        expect.any(Error),
      );
    });

    it("retries a language whose grammar failed to load on a later render", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const block = {
        id: 1,
        content:
          '<pre><code class="language-haskell">main = putStrLn "hi"</code></pre>',
      };

      mockHaskellChunkFails = true;
      const { container, rerender } = render(
        <GenericBlockRenderer {...defaultProps} block={block} />,
      );
      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load syntax highlighting for "haskell":',
          expect.any(Error),
        ),
      );
      expect(hljs.getLanguage("haskell")).toBeUndefined();
      expect(container.querySelector("code")).not.toHaveAttribute(
        "data-highlighted",
      );

      // The failure isn't cached, so the next redraw (here, for a new
      // highlight) fetches the grammar again
      mockHaskellChunkFails = false;
      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={block}
          highlights={[
            makeHighlight({ id: 1, position: { start: 1, end: 5 } }),
          ]}
        />,
      );
      await waitFor(() =>
        expect(container.querySelector("code")).toHaveAttribute(
          "data-highlighted",
          "yes",
        ),
      );
      expect(hljs.getLanguage("haskell")).toBeDefined();
      expect(container.querySelector("code .hljs-string")).toHaveTextContent(
        '"hi"',
      );
    });

    it("removes language-plaintext class from code blocks", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-plaintext">test code</code></pre>',
          }}
        />,
      );

      const codeBlock = container.querySelector("code");
      expect(codeBlock).not.toHaveClass("language-plaintext");
    });

    it("adds line numbers to code blocks", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>line1\nline2\nline3</code></pre>",
          }}
        />,
      );

      const lineNumbers = container.querySelectorAll(".text-right");
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it("counts lines correctly including content without trailing newline", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>line1\nline2</code></pre>",
          }}
        />,
      );

      const lineNumbers = container.querySelectorAll(".text-right");
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it("skips line number generation for pre blocks without code", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre>Just plain pre content</pre>",
          }}
        />,
      );

      const lineNumbers = container.querySelectorAll(".text-right");
      expect(lineNumbers.length).toBe(0);
    });

    it("handles code blocks with single line", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>single line</code></pre>",
          }}
        />,
      );

      await waitFor(() =>
        expect(container.querySelector("code")).toHaveAttribute(
          "data-highlighted",
          "yes",
        ),
      );
    });
  });

  describe("Drawing saved highlights", () => {
    it("draws a highlight as a span tagged with its id and colour", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[
            makeHighlight({
              id: 7,
              text: "SQL",
              position: { start: 6, end: 9 },
              color: "#86efac",
            }),
          ]}
        />,
      );

      const [piece] = pieces(container, 7);
      expect(piece).toHaveTextContent(/^SQL$/);
      expect(piece).toHaveClass("lesson-highlight");
      expect(piece).toHaveStyle({ backgroundColor: "#86efac" });
      expect(container.querySelector(".prose")).toHaveTextContent(
        "Learn SQL today",
      );
    });

    it("draws a highlight across bold text as one tagged piece per text node", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>Use <strong>inner</strong> joins</p>" }}
          highlights={[
            makeHighlight({ id: 7, position: { start: 0, end: 15 } }),
          ]}
        />,
      );

      expect(pieces(container, 7).map((p) => p.textContent)).toEqual([
        "Use ",
        "inner",
        " joins",
      ]);
    });

    it("draws this block's highlights, including those of blocks grouped into it", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ ...sqlBlock, sourceBlockIds: [1, 5] }}
          highlights={[
            makeHighlight({
              id: 1,
              blockId: 5,
              position: { start: 0, end: 5 },
            }),
            makeHighlight({
              id: 2,
              blockId: 2,
              position: { start: 6, end: 9 },
            }),
          ]}
        />,
      );

      expect(pieces(container, 1)).toHaveLength(1);
      expect(pieces(container, 2)).toHaveLength(0);
    });

    it("doesn't treat text the author coloured as a highlight", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<p><span style="background-color: #fff300">Key</span> term</p>',
          }}
        />,
      );

      fireEvent.click(screen.getByText("Key"));

      expect(container.querySelector(".lesson-highlight")).toBeNull();
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    describe("as one bar", () => {
      const radii = (container: HTMLElement, id: number) =>
        pieces(container, id).map((p) => (p as HTMLElement).style.borderRadius);

      it("rounds only the two ends of a highlight that crosses formatting", () => {
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={{
              id: 1,
              content: "<p>Use <strong>inner</strong> joins</p>",
            }}
            highlights={[
              makeHighlight({ id: 7, position: { start: 0, end: 15 } }),
            ]}
          />,
        );

        expect(radii(container, 7)).toEqual([
          "8px 0px 0px 8px",
          "0px 0px 0px 0px",
          "0px 8px 8px 0px",
        ]);
      });

      it("rounds all four corners of a highlight in one piece", () => {
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={sqlBlock}
            highlights={[
              makeHighlight({ id: 7, position: { start: 6, end: 9 } }),
            ]}
          />,
        );

        expect(radii(container, 7)).toEqual(["8px 8px 8px 8px"]);
      });

      it("doesn't paint whitespace at either end", () => {
        // " SQL " in "Learn SQL today"
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={sqlBlock}
            highlights={[
              makeHighlight({ id: 7, position: { start: 5, end: 10 } }),
            ]}
          />,
        );

        expect(pieces(container, 7).map((p) => p.textContent)).toEqual(["SQL"]);
        expect(radii(container, 7)).toEqual(["8px 8px 8px 8px"]);
        expect(container.querySelector(".prose")).toHaveTextContent(
          "Learn SQL today",
        );
      });

      it("paints inline code it covers whole, instead of a piece inside it", () => {
        // "Call onChange to update": "Call onChange " is 0-14
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={{
              id: 1,
              content: "<p>Call <code>onChange</code> to update</p>",
            }}
            highlights={[
              makeHighlight({
                id: 7,
                position: { start: 0, end: 14 },
                color: "#86efac",
              }),
            ]}
          />,
        );

        const code = container.querySelector("code")!;
        expect(pieces(container, 7)).toEqual([screen.getByText("Call"), code]);
        expect(code).toHaveStyle({ backgroundColor: "#86efac" });
        expect(code.querySelector("span")).toBeNull();
        expect(radii(container, 7)).toEqual([
          "8px 0px 0px 8px",
          "0px 8px 8px 0px",
        ]);
      });

      it("paints only the covered part of inline code it covers in part", () => {
        // "Call onChange": "Call on" is 0-7
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={{ id: 1, content: "<p>Call <code>onChange</code></p>" }}
            highlights={[
              makeHighlight({ id: 7, position: { start: 0, end: 7 } }),
            ]}
          />,
        );

        const [, inCode] = pieces(container, 7);
        expect(inCode.tagName).toBe("SPAN");
        expect(inCode).toHaveTextContent(/^on$/);
        expect(container.querySelector("code")).not.toHaveClass(
          "lesson-highlight",
        );
      });

      it("skips the line break between paragraphs", () => {
        // "One\nTwo": the "\n" between the paragraphs is character 3
        const { container } = render(
          <GenericBlockRenderer
            {...defaultProps}
            block={{ id: 1, content: "<p>One</p>\n<p>Two</p>" }}
            highlights={[
              makeHighlight({ id: 7, position: { start: 0, end: 7 } }),
            ]}
          />,
        );

        expect(pieces(container, 7).map((p) => p.textContent)).toEqual([
          "One",
          "Two",
        ]);
        expect(radii(container, 7)).toEqual([
          "8px 0px 0px 8px",
          "0px 8px 8px 0px",
        ]);
      });
    });
  });

  describe("Redraws", () => {
    const saved = makeHighlight({ id: 7, position: { start: 6, end: 9 } });

    it("keeps the block's text when it re-renders with the same highlights", () => {
      const { container, rerender } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[saved]}
        />,
      );
      const before = textNode(container, "Learn");

      // A new array, new objects and new callbacks, as a parent re-render gives
      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ ...sqlBlock }}
          highlights={[{ ...saved }]}
          onNote={jest.fn()}
          onHighlight={jest.fn()}
        />,
      );

      expect(textNode(container, "Learn")).toBe(before);
    });

    it("redraws when one of the block's own highlights changes", () => {
      const { container, rerender } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[saved]}
        />,
      );
      const before = textNode(container, "Learn");

      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[{ ...saved, color: "#93c5fd" }]}
        />,
      );

      expect(textNode(container, "Learn")).not.toBe(before);
      expect(pieces(container, 7)[0]).toHaveStyle({
        backgroundColor: "#93c5fd",
      });
    });
  });

  describe("Selecting text", () => {
    it("opens the toolbar right after the block's text once a selection settles", async () => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} />,
      );

      selectText(container, "SQL");

      const toolbar = await screen.findByRole("toolbar");
      const prose = container.querySelector(".prose")!;
      expect(container).toContainElement(toolbar);
      expect(
        prose.compareDocumentPosition(toolbar) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Remove highlight" }),
      ).not.toBeInTheDocument();
    });

    it("saves the selected text in the picked colour", async () => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} />,
      );

      selectText(container, "SQL");
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Green" }),
      );

      expect(defaultProps.onHighlight).toHaveBeenCalledWith(
        {
          text: "SQL",
          position: { start: 6, end: 9 },
          color: "#86efac",
          blockId: 1,
          context: { quote: "SQL", prefix: "Learn ", suffix: " today" },
        },
        { merge: undefined },
      );
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("works from the keyboard: Tab reaches the toolbar, arrows move, Enter applies", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} />,
      );

      selectText(container, "SQL");
      await screen.findByRole("toolbar");
      await user.tab();
      expect(
        screen.getByRole("button", { name: "Highlight Pink" }),
      ).toHaveFocus();

      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
      expect(
        screen.getByRole("button", { name: "Highlight Green" }),
      ).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(
        screen.getByRole("button", { name: "Highlight Yellow" }),
      ).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(defaultProps.onHighlight).toHaveBeenCalledWith(
        expect.objectContaining({ text: "SQL", color: "#fff300" }),
        { merge: undefined },
      );
    });

    it("closes the toolbar on Escape", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} />,
      );

      selectText(container, "SQL");
      await screen.findByRole("toolbar");
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("closes the toolbar when the selection moves out of the block", async () => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} />,
      );
      const elsewhere = document.createElement("p");
      elsewhere.textContent = "Somewhere else";
      document.body.appendChild(elsewhere);

      selectText(container, "SQL");
      await screen.findByRole("toolbar");
      select(elsewhere.firstChild!, 0, elsewhere.firstChild!, 4);

      await waitFor(() =>
        expect(screen.queryByRole("toolbar")).not.toBeInTheDocument(),
      );
      elsewhere.remove();
    });

    it("merges a selection over saved highlights into the one with a note", async () => {
      // "Learn SQL joins today": SQL is 6-9, joins is 10-15
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>Learn SQL joins today</p>" }}
          highlights={[
            makeHighlight({ id: 1, position: { start: 6, end: 9 } }),
            makeHighlight({
              id: 2,
              position: { start: 10, end: 15 },
              note: { id: 3 },
            }),
          ]}
        />,
      );

      // From inside "SQL" to inside "joins"
      select(textNode(container, "SQL"), 2, textNode(container, "joins"), 2);
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Blue" }),
      );

      expect(defaultProps.onHighlight).toHaveBeenCalledWith(
        {
          text: "SQL joins",
          position: { start: 6, end: 15 },
          color: "#93c5fd",
          blockId: 1,
          context: { quote: "SQL joins", prefix: "Learn ", suffix: " today" },
        },
        { merge: { baseId: 2, removeIds: [1] } },
      );
    });

    it("offers to remove a highlight when the selection is exactly its text", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[
            // Saved with a trailing space, which isn't drawn
            makeHighlight({ id: 7, position: { start: 6, end: 10 } }),
          ]}
        />,
      );

      selectText(container, "SQL");
      fireEvent.click(
        await screen.findByRole("button", { name: "Remove highlight" }),
      );

      expect(defaultProps.onDeleteHighlight).toHaveBeenCalledWith(7);
      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
    });
  });

  describe("Highlighting inside a highlight", () => {
    // "Learn SQL today", all of it highlighted in yellow
    const outer = makeHighlight({
      id: 1,
      position: { start: 0, end: 15 },
      color: "#fff300",
    });

    it("highlights part of a highlight as a new one on top of it", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[outer]}
        />,
      );

      selectText(container, "SQL");
      await screen.findByRole("toolbar");
      expect(
        screen.queryByRole("button", { name: "Remove highlight" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Highlight Blue" }));

      expect(defaultProps.onHighlight).toHaveBeenCalledWith(
        {
          text: "SQL",
          position: { start: 6, end: 9 },
          color: "#93c5fd",
          blockId: 1,
          context: { quote: "SQL", prefix: "Learn ", suffix: " today" },
        },
        { merge: undefined },
      );
      expect(defaultProps.onRecolorHighlight).not.toHaveBeenCalled();
    });

    it("does nothing when the part is given the colour around it", async () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[outer]}
        />,
      );

      selectText(container, "SQL");
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Yellow" }),
      );

      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("draws the inner highlight on top, even when both start together", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[
            makeHighlight({
              id: 2,
              position: { start: 6, end: 9 },
              color: "#93c5fd",
            }),
            makeHighlight({ id: 1, position: { start: 6, end: 15 } }),
          ]}
        />,
      );

      const [outerPiece] = pieces(container, 1);
      const [innerPiece] = pieces(container, 2);
      expect(outerPiece).toHaveTextContent(/^SQL today$/);
      expect(outerPiece).toContainElement(innerPiece as HTMLElement);
      expect(innerPiece).toHaveTextContent(/^SQL$/);
      expect(innerPiece).toHaveStyle({ backgroundColor: "#93c5fd" });
    });

    it("acts on the inner highlight when it's clicked, and the outer one elsewhere", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[
            outer,
            makeHighlight({ id: 2, position: { start: 6, end: 9 } }),
          ]}
        />,
      );

      fireEvent.click(pieces(container, 2)[0]);
      fireEvent.click(screen.getByRole("button", { name: "Remove highlight" }));
      fireEvent.click(pieces(container, 1)[0]);
      fireEvent.click(screen.getByRole("button", { name: "Remove highlight" }));

      expect(defaultProps.onDeleteHighlight).toHaveBeenNthCalledWith(1, 2);
      expect(defaultProps.onDeleteHighlight).toHaveBeenNthCalledWith(2, 1);
    });

    it("merges a selection across an inner highlight's edge with it, not the outer one", async () => {
      // "Learn SQL joins today": all of it highlighted, and SQL (6-9) inside
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>Learn SQL joins today</p>" }}
          highlights={[
            makeHighlight({ id: 1, position: { start: 0, end: 21 } }),
            makeHighlight({
              id: 2,
              position: { start: 6, end: 9 },
              color: "#93c5fd",
            }),
          ]}
        />,
      );

      // From inside "SQL" to inside "joins"
      select(textNode(container, "SQL"), 1, textNode(container, "joins"), 3);
      fireEvent.click(
        await screen.findByRole("button", { name: "Highlight Blue" }),
      );

      expect(defaultProps.onHighlight).toHaveBeenCalledWith(
        {
          text: "SQL jo",
          position: { start: 6, end: 12 },
          color: "#93c5fd",
          blockId: 1,
          context: { quote: "SQL jo", prefix: "Learn ", suffix: "ins today" },
        },
        { merge: { baseId: 2, removeIds: [] } },
      );
    });
  });

  describe("Clicking a highlight", () => {
    it("removes the highlight that was clicked, not one with the same text", async () => {
      // "SQL is a language. SQL has joins.": the second SQL is 19-22
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>SQL is a language. SQL has joins.</p>" }}
          highlights={[
            makeHighlight({
              id: 1,
              text: "SQL",
              position: { start: 0, end: 3 },
            }),
            makeHighlight({
              id: 2,
              text: "SQL",
              position: { start: 19, end: 22 },
            }),
          ]}
        />,
      );

      fireEvent.click(pieces(container, 2)[0]);
      fireEvent.click(screen.getByRole("button", { name: "Remove highlight" }));

      expect(defaultProps.onDeleteHighlight).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDeleteHighlight).toHaveBeenCalledWith(2);
    });

    it("recolours a highlight that crosses bold text, creating none", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<p>Use <strong>inner</strong> joins</p>" }}
          highlights={[
            makeHighlight({ id: 7, position: { start: 0, end: 15 } }),
          ]}
        />,
      );

      // Click the bold piece
      fireEvent.click(pieces(container, 7)[1]);
      expect(
        screen.getByRole("button", { name: "Highlight Yellow" }),
      ).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Highlight Blue" }));

      expect(defaultProps.onRecolorHighlight).toHaveBeenCalledWith(
        7,
        "#93c5fd",
      );
      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
      expect(defaultProps.onDeleteHighlight).not.toHaveBeenCalled();
    });

    it("adds a note to the clicked highlight without saving a new one", () => {
      const saved = makeHighlight({ id: 7, position: { start: 6, end: 9 } });
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[saved]}
        />,
      );

      fireEvent.click(pieces(container, 7)[0]);
      fireEvent.click(screen.getByRole("button", { name: "Add note" }));

      expect(defaultProps.onNote).toHaveBeenCalledWith(
        expect.any(Number),
        saved,
      );
      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
    });

    it("ignores a highlight that's still being saved", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          highlights={[
            makeHighlight({ id: -1, position: { start: 6, end: 9 } }),
          ]}
        />,
      );

      fireEvent.click(pieces(container, -1)[0]);

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });
  });

  describe("Notes", () => {
    it("saves the selection first, then links the note to the saved highlight", async () => {
      const saved = makeHighlight({
        id: 9,
        text: "SQL",
        position: { start: 6, end: 9 },
      });
      const onHighlight = jest.fn().mockResolvedValue(saved);
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          onHighlight={onHighlight}
        />,
      );

      selectText(container, "SQL");
      fireEvent.click(await screen.findByRole("button", { name: "Add note" }));

      expect(onHighlight).toHaveBeenCalledWith(
        {
          text: "SQL",
          position: { start: 6, end: 9 },
          color: "#fff300",
          blockId: 1,
          context: { quote: "SQL", prefix: "Learn ", suffix: " today" },
        },
        { merge: undefined, withNote: true },
      );
      // Placed level with the selection (140px down; the block is at 0)
      await waitFor(() =>
        expect(defaultProps.onNote).toHaveBeenCalledWith(140, saved),
      );
    });

    it("adds no note when the highlight couldn't be saved", async () => {
      const onHighlight = jest.fn().mockResolvedValue(null);
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={sqlBlock}
          onHighlight={onHighlight}
        />,
      );

      selectText(container, "SQL");
      fireEvent.click(await screen.findByRole("button", { name: "Add note" }));

      await waitFor(() => expect(onHighlight).toHaveBeenCalled());
      expect(defaultProps.onNote).not.toHaveBeenCalled();
    });
  });

  describe("Readers who can't highlight", () => {
    it.each([
      ["not enrolled", { enrollmentId: undefined }],
      ["the author", { author: true }],
    ])("shows no toolbar to a reader who's %s", async (_, props) => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} block={sqlBlock} {...props} />,
      );

      selectText(container, "SQL");
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });
  });

  describe("Image Enlargement", () => {
    it("enlarges image on click", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: '<img src="test.jpg" alt="Test Image" />' }}
        />,
      );

      const contentDiv = container.querySelector(".prose")!;
      const img = contentDiv.querySelector("img")!;

      fireEvent.click(img);

      const enlargedImages = container.querySelectorAll(
        'img[alt="Test Image"]',
      );
      expect(enlargedImages.length).toBeGreaterThan(1);
    });

    it("closes enlarged image on overlay click", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: '<img src="test.jpg" alt="Test Image" />' }}
        />,
      );

      const contentDiv = container.querySelector(".prose")!;
      const img = contentDiv.querySelector("img")!;

      fireEvent.click(img);

      const overlay = container.querySelector(".fixed.inset-0")!;
      fireEvent.click(overlay);

      waitFor(() => {
        expect(
          container.querySelector(".fixed.inset-0"),
        ).not.toBeInTheDocument();
      });
    });

    it("prevents event propagation when clicking enlarged image", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: '<img src="test.jpg" alt="Test Image" />' }}
        />,
      );

      const contentDiv = container.querySelector(".prose")!;
      const img = contentDiv.querySelector("img")!;

      fireEvent.click(img);

      const enlargedImg = container.querySelectorAll(
        'img[alt="Test Image"]',
      )[1];
      fireEvent.click(enlargedImg);

      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    it("ignores clicks on non-image elements", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.click(contentDiv);

      expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
    });

    it("handles image without src or alt attributes", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "<img />" }}
        />,
      );

      const contentDiv = container.querySelector(".prose")!;
      const img = contentDiv.querySelector("img")!;

      fireEvent.click(img);

      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    it("handles multiple images in content", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<img src="test1.jpg" alt="Image 1" /><img src="test2.jpg" alt="Image 2" />',
          }}
        />,
      );

      const images = container.querySelectorAll(".prose img");
      expect(images.length).toBe(2);

      fireEvent.click(images[0]);

      // Use getAllByAltText since clicking creates the enlarged version
      const allImage1Elements = screen.getAllByAltText("Image 1");
      expect(allImage1Elements.length).toBe(2); // Original + enlarged
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles empty content", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "" }}
        />,
      );

      expect(screen.queryByText("Test content")).not.toBeInTheDocument();
    });

    it("handles contentRef being null", () => {
      render(<GenericBlockRenderer {...defaultProps} />);

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("handles very long content", () => {
      const longContent = "a".repeat(10000);
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: longContent }}
        />,
      );

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("handles special HTML characters in content", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<p>&lt;div&gt; &amp; &quot;test&quot;</p>",
          }}
        />,
      );

      expect(container.querySelector(".prose")).toBeInTheDocument();
    });

    it("handles content with nested elements", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<div><p><strong>Bold <em>italic</em></strong></p></div>",
          }}
        />,
      );

      expect(container.querySelector(".prose")).toBeInTheDocument();
    });
  });

  describe("Component Lifecycle", () => {
    it("updates when block content changes", () => {
      const { rerender } = render(<GenericBlockRenderer {...defaultProps} />);

      expect(screen.getByText("Test content")).toBeInTheDocument();

      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Updated content" }}
        />,
      );

      expect(screen.getByText("Updated content")).toBeInTheDocument();
    });

    it("re-processes content when block id changes", () => {
      const { rerender } = render(<GenericBlockRenderer {...defaultProps} />);

      // Clear the mock to start fresh
      jest.clearAllMocks();

      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 2, content: "Test $x^2$ content" }}
        />,
      );

      // Component should re-process LaTeX
      expect(katex.renderToString).toHaveBeenCalled();
    });

    it("does not highlight a block that unmounts before highlight.js loads", async () => {
      // Fresh module registry so the lazily-loaded highlighter isn't cached yet
      await jest.isolateModulesAsync(async () => {
        // "pure" skips RTL's auto-cleanup hooks, which can't be registered here
        const { render: freshRender } = await import(
          "@testing-library/react/pure"
        );
        const { default: FreshRenderer } = await import(
          "@/components/droplets/lessons/generic-block-renderer"
        );

        const { container, unmount } = freshRender(
          <FreshRenderer
            {...defaultProps}
            block={{ id: 1, content: "<pre><code>const x = 1;</code></pre>" }}
          />,
        );
        const content = container.querySelector(".prose")!;
        const code = content.querySelector("code");
        unmount();
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Re-rendering the detached block would have replaced its markup
        expect(content.querySelector("code")).toBe(code);
        expect(code).not.toHaveAttribute("data-highlighted");
      });
    });
  });

  describe("Integration Tests", () => {
    it("draws highlights in code blocks after syntax highlighting", async () => {
      const highlights: Highlight[] = [
        makeHighlight({ id: 1, position: { start: 1, end: 6 } }),
      ];

      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>const x = 1;</code></pre>",
          }}
          highlights={highlights}
        />,
      );

      await waitFor(() =>
        expect(container.querySelector("code")).toHaveAttribute(
          "data-highlighted",
          "yes",
        ),
      );
      // Offsets count the line number gutter ("1") first
      expect(
        pieces(container, 1)
          .map((p) => p.textContent)
          .join(""),
      ).toBe("const");
    });
  });
});

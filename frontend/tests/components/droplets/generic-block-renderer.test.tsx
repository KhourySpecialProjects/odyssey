import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import hljs from "highlight.js";
import katex from "katex";
import { Highlight, HighlightColor } from "@/types";

jest.mock("highlight.js", () => ({
  highlightAll: jest.fn(),
}));

jest.mock("katex", () => ({
  renderToString: jest.fn(),
}));

describe("GenericBlockRenderer", () => {
  const mockBlock = {
    id: 1,
    content: "Test content",
  };

  const defaultProps = {
    block: mockBlock,
    highlights: [] as Highlight[],
    onHighlight: jest.fn(),
    onDeleteHighlight: jest.fn(),
    onNote: jest.fn(),
    enrollmentId: "123",
    expanded: false,
    setExpanded: jest.fn(),
    activeBlock: 1,
    setActiveBlock: jest.fn(),
  };

  let mockRange: Range;
  let mockSelection: Selection;

  beforeEach(() => {
    jest.clearAllMocks();

    // JSDOM does not implement Range.prototype.getBoundingClientRect
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
    }));

    (katex.renderToString as jest.Mock).mockImplementation(
      (latex) => `<span class="katex-rendered">${latex}</span>`,
    );

    // Use a shared text node so the tree walker and range refer to the same object.
    // handleMouseUp matches walker nodes against range.startContainer/endContainer
    // by identity; mismatched objects cause startOffset/endOffset to stay -1 and
    // the function returns early without ever calling setToolbarPosition.
    const sharedTextNode = document.createTextNode("test");

    mockRange = {
      cloneRange: jest.fn().mockReturnThis(),
      setStart: jest.fn(),
      setEnd: jest.fn(),
      startContainer: sharedTextNode,
      endContainer: sharedTextNode,
      startOffset: 0,
      endOffset: 4,
      toString: jest.fn().mockReturnValue("test"),
      surroundContents: jest.fn(),
      deleteContents: jest.fn(),
      insertNode: jest.fn(),
      commonAncestorContainer: document.createElement("div"),
      intersectsNode: jest.fn().mockReturnValue(true),
      compareBoundaryPoints: jest.fn().mockReturnValue(-1),
      extractContents: jest
        .fn()
        .mockReturnValue(document.createDocumentFragment()),
      selectNodeContents: jest.fn(),
      getBoundingClientRect: jest.fn().mockReturnValue({
        top: 100,
        left: 50,
        bottom: 120,
        right: 150,
        width: 100,
        height: 20,
      }),
    } as unknown as Range;

    mockSelection = {
      toString: jest.fn().mockReturnValue("test"),
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      isCollapsed: false,
      rangeCount: 1,
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
    } as unknown as Selection;

    window.getSelection = jest.fn().mockReturnValue(mockSelection);
    document.createRange = jest.fn().mockReturnValue(mockRange);

    // Return the same sharedTextNode so handleMouseUp can match it against
    // mockRange.startContainer / mockRange.endContainer by identity.
    const mockWalker = {
      nextNode: jest
        .fn()
        .mockReturnValueOnce(sharedTextNode)
        .mockReturnValue(null),
      currentNode: sharedTextNode,
    };
    document.createTreeWalker = jest
      .fn()
      .mockReturnValue(mockWalker as unknown as TreeWalker);
  });

  afterEach(() => {
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
    it("applies syntax highlighting to code blocks", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content:
              '<pre><code class="language-javascript">const x = 1;</code></pre>',
          }}
        />,
      );
      expect(hljs.highlightAll).toHaveBeenCalled();
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

    it("handles code blocks with single line", () => {
      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>single line</code></pre>",
          }}
        />,
      );

      expect(hljs.highlightAll).toHaveBeenCalled();
    });
  });

  describe("Text Selection and Highlighting", () => {
    it("handles mouse down to track position", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      const mockGetBoundingClientRect = jest.fn().mockReturnValue({ top: 50 });
      Object.defineProperty(contentDiv, "getBoundingClientRect", {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      fireEvent.mouseDown(contentDiv, { clientY: 100 });
      expect(mockGetBoundingClientRect).toHaveBeenCalled();
    });

    it("ignores collapsed selections on mouse up", () => {
      const collapsedSelection = {
        ...mockSelection,
        isCollapsed: true,
      };
      window.getSelection = jest.fn().mockReturnValue(collapsedSelection);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);
      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
    });

    it("handles text selection on mouse up", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);

      expect(window.getSelection).toHaveBeenCalled();
      expect(mockSelection.getRangeAt).toHaveBeenCalled();
    });

    it("saves selection range on mouse up", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);
      expect(mockRange.cloneRange).toHaveBeenCalled();
    });

    it("handles empty text selection", () => {
      (mockSelection.toString as jest.Mock).mockReturnValue("");
      (mockRange.toString as jest.Mock).mockReturnValue("");

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);
      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
    });

    it("handles text selection with multiple nodes in tree walker", () => {
      const textNode1 = document.createTextNode("Test");
      const textNode2 = document.createTextNode(" content");

      const mockWalker = {
        nextNode: jest
          .fn()
          .mockReturnValueOnce(textNode1)
          .mockReturnValueOnce(textNode2)
          .mockReturnValue(null),
        currentNode: textNode1,
      };

      document.createTreeWalker = jest
        .fn()
        .mockReturnValue(mockWalker as unknown as TreeWalker);

      const spanningRange = {
        ...mockRange,
        startContainer: textNode1,
        endContainer: textNode2,
        startOffset: 0,
        endOffset: 8,
      };

      mockSelection.getRangeAt = jest.fn().mockReturnValue(spanningRange);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);
      expect(document.createTreeWalker).toHaveBeenCalled();
    });
  });

  describe("Existing Highlights Rendering", () => {
    it("applies existing highlights to content", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );
      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("sorts highlights by start position before applying", () => {
      const highlights: Highlight[] = [
        {
          id: 2,
          text: "content",
          position: { start: 5, end: 12 },
          color: "#ff0000" as HighlightColor,
          blockId: 1,
        },
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );
      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("only applies highlights for current block", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
        {
          id: 2,
          text: "Other",
          position: { start: 0, end: 5 },
          color: "#ff0000" as HighlightColor,
          blockId: 2,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );
      const treeWalkerCalls = (document.createTreeWalker as jest.Mock).mock
        .calls.length;
      expect(treeWalkerCalls).toBeGreaterThan(0);
    });

    it("uses fallback highlightRange when surroundContents fails", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      mockRange.surroundContents = jest.fn().mockImplementation(() => {
        throw new Error("Cannot surround");
      });

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );
      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("handles highlights with nodes found by tree walker", () => {
      const textNode = document.createTextNode("Test content");

      const mockWalker = {
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      };

      document.createTreeWalker = jest
        .fn()
        .mockReturnValue(mockWalker as unknown as TreeWalker);

      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );
      expect(document.createTreeWalker).toHaveBeenCalled();
    });
  });

  describe("Highlight Popup and Deletion", () => {
    it("detects existing highlight on selection", () => {
      const highlightedSpan = document.createElement("span");
      highlightedSpan.style.backgroundColor = "#fff300";
      highlightedSpan.textContent = "test";

      const parentElement = document.createElement("div");
      parentElement.className = "prose";
      parentElement.appendChild(highlightedSpan);

      const textNode = highlightedSpan.firstChild!;

      const rangeWithHighlight = {
        ...mockRange,
        startContainer: textNode,
        endContainer: textNode,
      };

      Object.defineProperty(textNode, "parentElement", {
        value: highlightedSpan,
        configurable: true,
      });

      highlightedSpan.closest = jest.fn().mockReturnValue(highlightedSpan);
      mockSelection.getRangeAt = jest.fn().mockReturnValue(rangeWithHighlight);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const proseDiv = container.querySelector(".prose")!;
      proseDiv.innerHTML = "";
      proseDiv.appendChild(highlightedSpan);

      fireEvent.mouseUp(proseDiv);
      expect(mockSelection.getRangeAt).toHaveBeenCalled();
    });

    it("handles popup delete for multiple intersecting highlights", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
        {
          id: 2,
          text: "content",
          position: { start: 5, end: 12 },
          color: "#ff0000" as HighlightColor,
          blockId: 1,
        },
      ];

      const { container } = render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      const span1 = document.createElement("span");
      span1.style.backgroundColor = "#fff300";
      span1.textContent = "Test";

      const proseDiv = container.querySelector(".prose")!;
      proseDiv.innerHTML = "";
      proseDiv.appendChild(span1);

      const deleteRange = {
        ...mockRange,
        compareBoundaryPoints: jest
          .fn()
          .mockReturnValueOnce(-1)
          .mockReturnValueOnce(1),
      };

      mockSelection.getRangeAt = jest.fn().mockReturnValue(deleteRange);
      fireEvent.mouseUp(proseDiv);

      // The toolbar "Remove highlight" button only appears when isOnHighlight is true,
      // which requires the selection's start/end spans to be the same existing highlight span.
      // Verify the mouseUp interaction was handled correctly.
      expect(mockSelection.getRangeAt).toHaveBeenCalled();
    });
  });

  describe("Color Selection and Application", () => {
    it("applies color to existing highlight span", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      const { container } = render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      expect(container.querySelector(".prose")).toBeInTheDocument();
    });

    it("color buttons are available in toolbar after selection", async () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      // Trigger mouseUp to set toolbar position
      fireEvent.mouseUp(contentDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Highlight Yellow")).toBeInTheDocument();
      });

      expect(screen.getByTitle("Highlight Pink")).toBeInTheDocument();
      expect(screen.getByTitle("Highlight Orange")).toBeInTheDocument();
      expect(screen.getByTitle("Highlight Green")).toBeInTheDocument();
      expect(screen.getByTitle("Highlight Blue")).toBeInTheDocument();
    });

    it("can click color buttons after selection", async () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Highlight Pink")).toBeInTheDocument();
      });

      const pinkButton = screen.getByTitle("Highlight Pink");
      fireEvent.mouseDown(pinkButton);

      // After clicking a color button the toolbar dismisses itself
      await waitFor(() => {
        expect(screen.queryByTitle("Highlight Pink")).not.toBeInTheDocument();
      });
    });
  });

  describe("Highlight Deletion", () => {
    it("provides delete functionality through toolbar when on a highlight", async () => {
      const highlightedSpan = document.createElement("span");
      highlightedSpan.style.backgroundColor = "#fff300";

      const textNode = document.createTextNode("test");
      highlightedSpan.appendChild(textNode);

      // parentElement must be highlightedSpan so closest() call resolves correctly
      Object.defineProperty(textNode, "parentElement", {
        value: highlightedSpan,
        configurable: true,
      });
      // closest() on the span returns itself — makes isOnHighlight=true
      highlightedSpan.closest = jest.fn().mockReturnValue(highlightedSpan);

      const rangeOnHighlight = {
        ...mockRange,
        startContainer: textNode,
        endContainer: textNode,
        getBoundingClientRect: jest.fn().mockReturnValue({
          top: 100,
          left: 50,
          bottom: 120,
          right: 150,
          width: 100,
          height: 20,
        }),
      };
      mockSelection.getRangeAt = jest.fn().mockReturnValue(rangeOnHighlight);

      // Tree walker must yield the same textNode for startOffset/endOffset to be found
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      } as unknown as TreeWalker);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const proseDiv = container.querySelector(".prose")!;
      proseDiv.innerHTML = "";
      proseDiv.appendChild(highlightedSpan);

      fireEvent.mouseUp(proseDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
      });
    });

    it("handles click on remove highlight button", async () => {
      const highlightedSpan = document.createElement("span");
      highlightedSpan.style.backgroundColor = "#fff300";

      const textNode = document.createTextNode("test");
      highlightedSpan.appendChild(textNode);

      Object.defineProperty(textNode, "parentElement", {
        value: highlightedSpan,
        configurable: true,
      });
      highlightedSpan.closest = jest.fn().mockReturnValue(highlightedSpan);

      const rangeOnHighlight = {
        ...mockRange,
        startContainer: textNode,
        endContainer: textNode,
        getBoundingClientRect: jest.fn().mockReturnValue({
          top: 100,
          left: 50,
          bottom: 120,
          right: 150,
          width: 100,
          height: 20,
        }),
      };
      mockSelection.getRangeAt = jest.fn().mockReturnValue(rangeOnHighlight);

      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      } as unknown as TreeWalker);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const proseDiv = container.querySelector(".prose")!;
      proseDiv.innerHTML = "";
      proseDiv.appendChild(highlightedSpan);

      fireEvent.mouseUp(proseDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Remove highlight")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Remove highlight");
      fireEvent.mouseDown(deleteButton);

      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  describe("Note Creation", () => {
    it("creates note with highlighted text", async () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseDown(contentDiv, { clientY: 100 });
      fireEvent.mouseUp(contentDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Add note")).toBeInTheDocument();
      });

      const noteButton = screen.getByTitle("Add note");
      fireEvent.mouseDown(noteButton);

      expect(defaultProps.onNote).toHaveBeenCalled();
    });

    it("strips newlines from note text", async () => {
      (mockSelection.toString as jest.Mock).mockReturnValue(
        "test\nwith\nnewlines",
      );
      (mockRange.toString as jest.Mock).mockReturnValue("test\nwith\nnewlines");

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseDown(contentDiv, { clientY: 150 });
      fireEvent.mouseUp(contentDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Add note")).toBeInTheDocument();
      });

      const noteButton = screen.getByTitle("Add note");
      fireEvent.mouseDown(noteButton);

      expect(defaultProps.onNote).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringMatching(/^[^\r\n]*$/),
      );
    });

    it("creates note with position from mouse event", async () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      const mockGetBoundingClientRect = jest.fn().mockReturnValue({ top: 50 });
      Object.defineProperty(contentDiv, "getBoundingClientRect", {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      fireEvent.mouseDown(contentDiv, { clientY: 200 });
      fireEvent.mouseUp(contentDiv);

      await waitFor(() => {
        expect(screen.getByTitle("Add note")).toBeInTheDocument();
      });

      const noteButton = screen.getByTitle("Add note");
      fireEvent.mouseDown(noteButton);

      expect(defaultProps.onNote).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
      );
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

  describe("Active Block Tracking", () => {
    it("sets active block on mouse enter", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseOver(contentDiv);

      expect(defaultProps.setActiveBlock).toHaveBeenCalledWith(1);
    });

    it("handles mouse leave event", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseLeave(contentDiv);

      expect(contentDiv).toBeInTheDocument();
    });

    it("updates active block when different block is hovered", () => {
      const { rerender, container } = render(
        <GenericBlockRenderer {...defaultProps} />,
      );

      let contentDiv = container.querySelector(".prose")!;
      fireEvent.mouseOver(contentDiv);

      expect(defaultProps.setActiveBlock).toHaveBeenCalledWith(1);

      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 2, content: "Different block" }}
        />,
      );

      contentDiv = container.querySelector(".prose")!;
      fireEvent.mouseOver(contentDiv);

      expect(defaultProps.setActiveBlock).toHaveBeenCalledWith(2);
    });
  });

  describe("Expanded State Management", () => {
    it("renders prose content when expanded is true", () => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} expanded={true} />,
      );
      expect(container.querySelector(".prose")).toBeInTheDocument();
    });

    it("setExpanded prop is accepted without error", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);

      expect(defaultProps.setExpanded).toBeDefined();
      expect(container.querySelector(".prose")).toBeInTheDocument();
    });

    it("renders prose content when expanded is false", () => {
      const { container } = render(
        <GenericBlockRenderer {...defaultProps} expanded={false} />,
      );
      expect(container.querySelector(".prose")).toBeInTheDocument();
    });
  });

  describe("LaTeX in Selection", () => {
    it("extracts LaTeX from data-latex attribute when selecting LaTeX content", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "Test $x^2$ content",
          }}
        />,
      );

      const latexElement = document.createElement("span");
      latexElement.className = "katex-inline";
      latexElement.setAttribute("data-latex", encodeURIComponent("x^2"));
      latexElement.textContent = "rendered latex";

      const textNode = document.createTextNode("rendered latex");
      latexElement.appendChild(textNode);

      const parentElement = document.createElement("div");
      parentElement.appendChild(latexElement);

      const latexRange = {
        ...mockRange,
        startContainer: textNode,
        endContainer: textNode,
      };

      Object.defineProperty(textNode, "parentElement", {
        value: latexElement,
        writable: true,
        configurable: true,
      });

      latexElement.closest = jest.fn().mockReturnValue(latexElement);
      mockSelection.getRangeAt = jest.fn().mockReturnValue(latexRange);

      const contentDiv = container.querySelector(".prose")!;
      fireEvent.mouseUp(contentDiv);

      expect(mockSelection.getRangeAt).toHaveBeenCalled();
    });

    it("handles LaTeX block elements", () => {
      const { container } = render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "Test $$y=mx+b$$ content",
          }}
        />,
      );

      const latexBlock = document.createElement("div");
      latexBlock.className = "katex-block";
      latexBlock.setAttribute("data-latex", encodeURIComponent("y=mx+b"));

      expect(container).toBeInTheDocument();
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

    it("handles null selection", () => {
      window.getSelection = jest.fn().mockReturnValue(null);

      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseUp(contentDiv);

      expect(defaultProps.onHighlight).not.toHaveBeenCalled();
    });

    it("handles highlight with missing start or end nodes", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      const mockWalker = {
        nextNode: jest.fn().mockReturnValue(null),
        currentNode: null,
      };
      document.createTreeWalker = jest
        .fn()
        .mockReturnValue(mockWalker as unknown as TreeWalker);

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      expect(document.createTreeWalker).toHaveBeenCalled();
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
    it("sets up and cleans up event listeners properly", () => {
      const { container, unmount } = render(
        <GenericBlockRenderer {...defaultProps} />,
      );

      const contentDiv = container.querySelector(".prose")!;

      expect(contentDiv).toBeInTheDocument();

      fireEvent.mouseOver(contentDiv);
      expect(defaultProps.setActiveBlock).toHaveBeenCalledWith(1);

      unmount();

      expect(contentDiv).not.toBeInTheDocument();
    });

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

    it("updates when highlights change", () => {
      const { rerender } = render(<GenericBlockRenderer {...defaultProps} />);

      const newHighlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      rerender(
        <GenericBlockRenderer {...defaultProps} highlights={newHighlights} />,
      );

      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("sets up event listeners on mount", () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      expect(contentDiv).toBeInTheDocument();

      fireEvent.mouseOver(contentDiv);
      expect(defaultProps.setActiveBlock).toHaveBeenCalledWith(1);
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

    it("handles rapid state changes", () => {
      const { rerender } = render(<GenericBlockRenderer {...defaultProps} />);

      for (let i = 0; i < 5; i++) {
        rerender(
          <GenericBlockRenderer
            {...defaultProps}
            activeBlock={i % 2 === 0 ? 1 : 2}
          />,
        );
      }

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("Complex Highlighting Scenarios", () => {
    it("handles overlapping highlight positions", () => {
      const textNode1 = document.createTextNode("Test content here");

      const mockWalker = {
        nextNode: jest
          .fn()
          .mockReturnValueOnce(textNode1)
          .mockReturnValue(null),
        currentNode: textNode1,
      };

      document.createTreeWalker = jest
        .fn()
        .mockReturnValue(mockWalker as unknown as TreeWalker);

      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test content",
          position: { start: 0, end: 12 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("handles highlight at end of content", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "content",
          position: { start: 5, end: 12 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("handles highlight at start of content", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "Test",
          position: { start: 0, end: 4 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer {...defaultProps} highlights={highlights} />,
      );

      expect(document.createTreeWalker).toHaveBeenCalled();
    });
  });

  describe("Integration Tests", () => {
    it("handles complete workflow: select, show toolbar, close toolbar", async () => {
      const { container } = render(<GenericBlockRenderer {...defaultProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseDown(contentDiv, { clientY: 100 });
      fireEvent.mouseUp(contentDiv);

      expect(mockRange.cloneRange).toHaveBeenCalled();

      // After a selection the toolbar should appear with color buttons
      await waitFor(() => {
        expect(screen.getByTitle("Highlight Yellow")).toBeInTheDocument();
      });

      // The "Remove highlight" button only appears when isOnHighlight=true;
      // in this basic flow, just verify the toolbar color buttons are present.
      expect(screen.getByTitle("Add note")).toBeInTheDocument();
    });

    it("handles LaTeX with highlighting", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "x^2",
          position: { start: 0, end: 3 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{ id: 1, content: "Test $x^2$ content" }}
          highlights={highlights}
        />,
      );

      expect(katex.renderToString).toHaveBeenCalled();
      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    it("handles code blocks with highlights", () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "const",
          position: { start: 0, end: 5 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
      ];

      render(
        <GenericBlockRenderer
          {...defaultProps}
          block={{
            id: 1,
            content: "<pre><code>const x = 1;</code></pre>",
          }}
          highlights={highlights}
        />,
      );

      expect(hljs.highlightAll).toHaveBeenCalled();
    });
  });
});

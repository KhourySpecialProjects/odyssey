import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import hljs from "highlight.js/lib/core";
import katex from "katex";
import { Highlight, HighlightColor } from "@/types";

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

describe("GenericBlockRenderer", () => {
  const mockBlock = {
    id: 1,
    content: "Test content",
  };

  const defaultProps = {
    block: mockBlock,
    highlights: [] as Highlight[],
    onHighlight: jest.fn().mockResolvedValue(null),
    onUpdateHighlight: jest.fn().mockResolvedValue(null),
    onMergeHighlights: jest.fn().mockResolvedValue(null),
    onDeleteHighlight: jest.fn().mockResolvedValue(true),
    onNote: jest.fn(),
    enrollmentId: "123",
  };

  let mockRange: Range;
  let mockSelection: Selection;

  beforeEach(() => {
    jest.clearAllMocks();

    // JSDOM does not implement Range.prototype.getBoundingClientRect
    function makeDOMRect(overrides: Partial<DOMRect> = {}): DOMRect {
      return {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...overrides,
      };
    }
    Range.prototype.getBoundingClientRect = jest.fn(() => makeDOMRect());

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

      // The failure isn't cached, so the next redraw fetches the grammar again.
      // A block only redraws when its content or its own highlights change, so
      // add a highlight to this block.
      mockHaskellChunkFails = false;
      rerender(
        <GenericBlockRenderer
          {...defaultProps}
          block={block}
          highlights={[
            {
              id: 1,
              text: "main",
              position: { start: 0, end: 4 },
              color: "#fff300",
              blockId: 1,
            },
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

  describe("LaTeX in Selection", () => {
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
    it("removes its content on unmount", () => {
      const { container, unmount } = render(
        <GenericBlockRenderer {...defaultProps} />,
      );

      const contentDiv = container.querySelector(".prose")!;

      expect(contentDiv).toBeInTheDocument();

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
            enrollmentId={i % 2 === 0 ? "123" : undefined}
          />,
        );
      }

      expect(screen.getByText("Test content")).toBeInTheDocument();
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
    });

    it("handles code blocks with highlights", async () => {
      const highlights: Highlight[] = [
        {
          id: 1,
          text: "const",
          position: { start: 0, end: 5 },
          color: "#fff300" as HighlightColor,
          blockId: 1,
        },
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
    });
  });
});

import { render, fireEvent, act, screen } from "@testing-library/react";
import GenericBlockRenderer from "@/components/droplets/lessons/GenericBlockRenderer";
import hljs from "highlight.js";
import katex from "katex";
import { Highlight, HighlightColor } from "@/types";

jest.mock("highlight.js", () => ({
  highlightAll: jest.fn(),
}));

jest.mock("katex", () => ({
  renderToString: jest
    .fn()
    .mockReturnValue('<span class="katex">mocked latex</span>'),
}));

const mockSelection = {
  addRange: jest.fn(),
  isCollapsed: false,
  getRangeAt: jest.fn().mockReturnValue({
    cloneRange: jest.fn().mockReturnValue({
      compareBoundaryPoints: jest.fn().mockReturnValue(-1),
    }),
  }),
};

Object.defineProperty(window, "getSelection", {
  value: jest.fn().mockReturnValue(mockSelection),
});

describe("GenericBlockRenderer", () => {
  const mockProps = {
    block: {
      id: 1,
      content: "Test content",
    },
    highlights: [],
    onHighlight: jest.fn(),
    onDeleteHighlight: jest.fn(),
    onNote: jest.fn(),
    genericBlocks: [1],
    enrollmentId: "123",
    expanded: false,
    setExpanded: jest.fn(),
    activeBlock: 1,
    setActiveBlock: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.getSelection = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue("selected text"),
      getRangeAt: jest.fn().mockReturnValue({
        cloneRange: jest.fn().mockReturnValue({
          startContainer: document.createTextNode("test"),
          endContainer: document.createTextNode("test"),
          startOffset: 0,
          endOffset: 4,
          toString: () => "test",
          surroundContents: jest.fn(),
        }),
        startContainer: document.createTextNode("test"),
        endContainer: document.createTextNode("test"),
        startOffset: 0,
        endOffset: 4,
        surroundContents: jest.fn(),
      }),
      isCollapsed: false,
    });
  });

  describe("text selection and highlighting", () => {
    it("handles mouse down event and sets position", () => {
      const { container } = render(<GenericBlockRenderer {...mockProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseDown(contentDiv, {
        clientY: 100,
        currentTarget: {
          getBoundingClientRect: () => ({ top: 50 }),
        },
      });

      fireEvent.mouseUp(contentDiv);
      expect(mockProps.onHighlight).not.toHaveBeenCalled();
    });

    it("handles highlight deletion", async () => {
      const propsWithHighlight = {
        ...mockProps,
        highlights: [
          {
            id: 1,
            text: "test",
            position: { start: 0, end: 4 },
            color: "#fff300" as HighlightColor,
            blockId: 1,
          },
        ],
      };

      const { container } = render(
        <GenericBlockRenderer {...propsWithHighlight} />,
      );
      const contentDiv = container.querySelector(".prose")!;

      await act(async () => {
        fireEvent.mouseUp(contentDiv);
      });

      const handlePopupDelete = container.querySelector('[role="button"]');
      if (handlePopupDelete) {
        fireEvent.click(handlePopupDelete);
        expect(mockProps.onDeleteHighlight).toHaveBeenCalledWith(1);
      }
    });

    it("creates note with highlighted text", async () => {
      const { container } = render(<GenericBlockRenderer {...mockProps} />);
      const contentDiv = container.querySelector(".prose")!;

      fireEvent.mouseDown(contentDiv, {
        clientY: 100,
        currentTarget: {
          getBoundingClientRect: () => ({ top: 50 }),
        },
      });

      await act(async () => {
        fireEvent.mouseUp(contentDiv);
      });

      const handleCreateNote = container.querySelector('[role="button"]');
      if (handleCreateNote) {
        fireEvent.click(handleCreateNote);
        expect(mockProps.onNote).toHaveBeenCalledWith(
          expect.any(Number),
          "test",
        );
        expect(mockProps.onHighlight).toHaveBeenCalledWith(
          expect.any(Object),
          true,
        );
      }
    });
  });

  describe("content rendering", () => {
    it("processes and renders LaTeX content", () => {
      const latexProps = {
        ...mockProps,
        block: {
          id: 1,
          content: "Test with inline $x^2$ and block $$y^2$$ latex",
        },
      };

      const { container } = render(<GenericBlockRenderer {...latexProps} />);
      expect(katex.renderToString).toHaveBeenCalled();
      expect(container.innerHTML).toContain("katex");
    });

    it("renders code blocks with syntax highlighting", () => {
      const codeProps = {
        ...mockProps,
        block: {
          id: 1,
          content:
            '<pre><code class="language-javascript">const x = 1;</code></pre>',
        },
      };

      render(<GenericBlockRenderer {...codeProps} />);
      expect(hljs.highlightAll).toHaveBeenCalled();
    });
  });

  jest.mock("highlight.js", () => ({
    highlightAll: jest.fn(),
  }));

  jest.mock("katex", () => ({
    renderToString: jest.fn(),
  }));

  describe("GenericBlockRenderer", () => {
    const mockBlock = {
      content: "Test content with $inline$ and $$block$$ LaTeX",
      id: 1,
    };

    const mockHighlights: Highlight[] = [
      {
        id: 1,
        text: "Test content",
        position: { start: 0, end: 12 },
        color: "#fff300" as HighlightColor,
        blockId: 1,
      },
    ];

    const defaultProps = {
      block: mockBlock,
      highlights: mockHighlights,
      onHighlight: jest.fn(),
      onDeleteHighlight: jest.fn(),
      onNote: jest.fn(),
      enrollmentId: "123",
      expanded: false,
      setExpanded: jest.fn(),
      activeBlock: 1,
      setActiveBlock: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (katex.renderToString as jest.Mock).mockImplementation(
        (latex) => `<span>${latex}</span>`,
      );
    });

    describe("LaTeX Processing", () => {
      it("should process inline LaTeX", () => {
        render(<GenericBlockRenderer {...defaultProps} />);

        expect(katex.renderToString).toHaveBeenCalledWith("inline", {
          throwOnError: false,
          displayMode: false,
        });
      });

      it("should process block LaTeX", () => {
        render(<GenericBlockRenderer {...defaultProps} />);

        expect(katex.renderToString).toHaveBeenCalledWith("block", {
          throwOnError: false,
          displayMode: true,
        });
      });

      it("should handle LaTeX processing errors", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();
        (katex.renderToString as jest.Mock).mockImplementationOnce(() => {
          throw new Error("LaTeX error");
        });

        render(<GenericBlockRenderer {...defaultProps} />);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to render inline LaTeX:",
          expect.any(Error),
        );
        consoleSpy.mockRestore();
      });
    });

    describe("Code Block Processing", () => {
      it("should process code blocks with line numbers", () => {
        const blockWithCode = {
          ...mockBlock,
          content: "<pre><code>line1\nline2\nline3</code></pre>",
        };

        render(
          <GenericBlockRenderer {...defaultProps} block={blockWithCode} />,
        );

        expect(hljs.highlightAll).toHaveBeenCalled();
        const lineNumbers = screen.getAllByText(/^[1-3]$/);
        expect(lineNumbers).toHaveLength(3);
      });

      it("should remove plaintext language class", () => {
        const blockWithPlaintext = {
          ...mockBlock,
          content: '<pre><code class="language-plaintext">test</code></pre>',
        };

        render(
          <GenericBlockRenderer {...defaultProps} block={blockWithPlaintext} />,
        );

        const codeBlock = screen.getByText("test");
        expect(codeBlock).not.toHaveClass("language-plaintext");
      });
    });

    describe("Highlighting", () => {
      it("should apply existing highlights", () => {
        render(<GenericBlockRenderer {...defaultProps} />);

        const highlightedText = screen.getByText("Test content");
        expect(highlightedText).toHaveStyle({ backgroundColor: "#fff300" });
      });
    });

    describe("Image Handling", () => {
      it("should handle image click and enlargement", () => {
        const blockWithImage = {
          ...mockBlock,
          content: '<img src="test.jpg" alt="Test image" />',
        };

        render(
          <GenericBlockRenderer {...defaultProps} block={blockWithImage} />,
        );

        const image = screen.getAllByAltText("Test image")[0];
        fireEvent.click(image);

        const enlargedImage = screen.getAllByAltText("Test image")[1];
        expect(enlargedImage).toHaveClass("max-h-[75%]");
      });
    });

    describe("Note Creation", () => {
      it("should handle note creation on text selection", () => {
        render(<GenericBlockRenderer {...defaultProps} />);

        const content = screen.getByText("Test content");

        const range = document.createRange();
        range.selectNodeContents(content);
        mockSelection.getRangeAt.mockReturnValueOnce(range);

        fireEvent.mouseDown(content, { clientY: 100 });
        fireEvent.mouseUp(content);

        const noteButton = screen.getByTitle("Take Note");
        fireEvent.click(noteButton);

        expect(defaultProps.onNote).toHaveBeenCalledWith(
          expect.any(Number),
          "",
        );
      });
    });
  });
});

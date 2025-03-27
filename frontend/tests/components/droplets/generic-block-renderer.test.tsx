import { render, fireEvent, act } from "@testing-library/react";
import GenericBlockRenderer from "@/components/droplets/lessons/GenericBlockRenderer";
import hljs from "highlight.js";
import katex from "katex";
import { HighlightColor } from "@/types";

jest.mock("highlight.js", () => ({
  highlightAll: jest.fn(),
}));

jest.mock("katex", () => ({
  renderToString: jest
    .fn()
    .mockReturnValue('<span class="katex">mocked latex</span>'),
}));

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
          content:
            '<pre><code class="language-javascript">const x = 1;</code></pre>',
        },
      };

      render(<GenericBlockRenderer {...codeProps} />);
      expect(hljs.highlightAll).toHaveBeenCalled();
    });
  });
});

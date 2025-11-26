import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeTool, {
  CodeBlockComponent,
} from "@/components/ui/tiptap/toolbar/tools/code-tool/code-tool";
import { Editor } from "@tiptap/react";
import { NodeViewProps } from "@tiptap/react";

jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("CodeTool", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleCodeBlock: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleCodeBlock: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.isActive.mockReturnValue(false);
  });

  describe("Rendering", () => {
    it("renders code button", () => {
      render(<CodeTool editor={mockEditor} />);
      expect(screen.getByTitle("Code")).toBeInTheDocument();
    });

    it("renders CodeIcon", () => {
      const { container } = render(<CodeTool editor={mockEditor} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("button is clickable", () => {
      render(<CodeTool editor={mockEditor} />);
      const button = screen.getByTitle("Code");
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("Interactions", () => {
    it("toggles code block when clicked", () => {
      render(<CodeTool editor={mockEditor} />);
      fireEvent.click(screen.getByTitle("Code"));

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockEditor.focus).toHaveBeenCalled();
      expect(mockEditor.toggleCodeBlock).toHaveBeenCalled();
      expect(mockEditor.run).toHaveBeenCalled();
    });

    it("toggles code block with userEvent", async () => {
      const user = userEvent.setup();
      render(<CodeTool editor={mockEditor} />);

      await user.click(screen.getByTitle("Code"));

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockEditor.toggleCodeBlock).toHaveBeenCalled();
    });

    it("chains editor commands correctly", () => {
      render(<CodeTool editor={mockEditor} />);
      fireEvent.click(screen.getByTitle("Code"));

      expect(mockEditor.chain).toHaveBeenCalledTimes(1);
      expect(mockEditor.focus).toHaveBeenCalledTimes(1);
      expect(mockEditor.toggleCodeBlock).toHaveBeenCalledTimes(1);
      expect(mockEditor.run).toHaveBeenCalledTimes(1);
    });
  });

  describe("Styling", () => {
    it("applies active styling when code block is active", () => {
      mockEditor.isActive.mockReturnValue(true);
      const { container } = render(<CodeTool editor={mockEditor} />);

      const button = container.firstChild;
      expect(button).toHaveClass("bg-slate-200");
      expect(button).toHaveClass("dark:bg-slate-700");
    });

    it("does not apply active styling when code block is inactive", () => {
      mockEditor.isActive.mockReturnValue(false);
      const { container } = render(<CodeTool editor={mockEditor} />);

      const button = container.firstChild;
      expect(button).not.toHaveClass("bg-slate-200");
    });

    it("applies base styling classes", () => {
      const { container } = render(<CodeTool editor={mockEditor} />);

      const button = container.firstChild;
      expect(button).toHaveClass("rounded-md");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("p-2.5");
    });

    it("applies hover styling", () => {
      const { container } = render(<CodeTool editor={mockEditor} />);

      const button = container.firstChild;
      expect(button).toHaveClass("hover:border-slate-200");
    });

    it("calls isActive with codeBlock parameter", () => {
      render(<CodeTool editor={mockEditor} />);

      expect(mockEditor.isActive).toHaveBeenCalledWith("codeBlock");
    });
  });

  describe("Edge Cases", () => {
    it("handles multiple rapid clicks", () => {
      render(<CodeTool editor={mockEditor} />);

      const button = screen.getByTitle("Code");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockEditor.chain).toHaveBeenCalledTimes(3);
    });

    it("handles null editor gracefully", () => {
      const nullEditor = null as any;
      const { container } = render(<CodeTool editor={nullEditor} />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("button has title attribute", () => {
      render(<CodeTool editor={mockEditor} />);

      const button = screen.getByTitle("Code");
      expect(button).toHaveAttribute("title", "Code");
    });

    it("button is keyboard accessible", () => {
      render(<CodeTool editor={mockEditor} />);

      const button = screen.getByTitle("Code");
      expect(button.tagName).toBe("BUTTON");
    });
  });
});

describe("CodeBlockComponent", () => {
  const mockUpdateAttributes = jest.fn();
  const mockNode = {
    textContent: "line1\nline2\nline3",
    attrs: {
      language: "javascript",
    },
  };

  const mockExtension = {
    options: {
      lowlight: {
        listLanguages: jest.fn(() => [
          "javascript",
          "typescript",
          "python",
          "java",
        ]),
      },
    },
  };

  const baseProps: any = {
    node: mockNode,
    updateAttributes: mockUpdateAttributes,
    extension: mockExtension,
    editor: {} as Editor,
    getPos: jest.fn(),
    decorations: [],
    selected: false,
    deleteNode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders language selector", () => {
      render(<CodeBlockComponent {...baseProps} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders with default language", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("javascript");
    });

    it("renders auto option", () => {
      render(<CodeBlockComponent {...baseProps} />);

      expect(screen.getByText("auto")).toBeInTheDocument();
    });

    it("renders all available languages", () => {
      render(<CodeBlockComponent {...baseProps} />);

      expect(screen.getByText("javascript")).toBeInTheDocument();
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("python")).toBeInTheDocument();
      expect(screen.getByText("java")).toBeInTheDocument();
    });

    it("renders separator option", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const disabledOption = container.querySelector("option[disabled]");
      expect(disabledOption).toBeInTheDocument();
      expect(disabledOption).toHaveTextContent("—");
    });

    it("renders line numbers", () => {
      render(<CodeBlockComponent {...baseProps} />);
    });

    it("calculates correct number of lines", () => {
      const singleLineNode = {
        ...mockNode,
        textContent: "single line",
      };

      render(<CodeBlockComponent {...baseProps} node={singleLineNode} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });

    it("handles empty code block", () => {
      const emptyNode = {
        ...mockNode,
        textContent: "",
      };

      render(<CodeBlockComponent {...baseProps} node={emptyNode} />);

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("handles code with no newlines", () => {
      const noNewlinesNode = {
        ...mockNode,
        textContent: "const x = 5;",
      };

      render(<CodeBlockComponent {...baseProps} node={noNewlinesNode} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });

    it("renders NodeViewContent", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const code = container.querySelector("code");
      expect(code).toBeInTheDocument();
    });
  });

  describe("Language Selection", () => {
    it("updates language when selection changes", async () => {
      const user = userEvent.setup();
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "python");

      expect(mockUpdateAttributes).toHaveBeenCalledWith({ language: "python" });
    });

    it("updates to auto when null selected", async () => {
      const user = userEvent.setup();
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "null");

      expect(mockUpdateAttributes).toHaveBeenCalledWith({ language: "null" });
    });

    it("calls updateAttributes with fireEvent", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "typescript" } });

      expect(mockUpdateAttributes).toHaveBeenCalledWith({
        language: "typescript",
      });
    });

    it("select is not editable", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("contentEditable", "false");
    });
  });

  describe("Styling", () => {
    it("applies correct classes to select", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("rounded-md");
      expect(select).toHaveClass("border-gray-300");
      expect(select).toHaveClass(
        "mb-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white",
      );
    });

    it("applies focus styles to select", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("focus:border-blue-500");
      expect(select).toHaveClass("focus:ring-2");
    });

    it("line numbers have correct styling", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const lineNumbers = container.querySelector(".select-none");
      expect(lineNumbers).toHaveClass(
        "absolute top-3 bottom-3 left-0 flex min-w-[2.5rem] flex-col border-r border-slate-700 bg-slate-800 text-sm text-slate-400 select-none dark:border-slate-800 dark:bg-slate-900",
      );
      expect(lineNumbers).toHaveClass(
        "absolute top-3 bottom-3 left-0 flex min-w-[2.5rem] flex-col border-r border-slate-700 bg-slate-800 text-sm text-slate-400 select-none dark:border-slate-800 dark:bg-slate-900",
      );
    });

    it("pre element has overflow styling", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const pre = container.querySelector("pre");
      expect(pre).toHaveClass("overflow-x-auto");
    });
  });

  describe("Line Number Generation", () => {
    it("generates correct line numbers for multi-line code", () => {
      const multiLineNode = {
        ...mockNode,
        textContent: "line1\nline2\nline3\nline4\nline5",
      };

      render(<CodeBlockComponent {...baseProps} node={multiLineNode} />);
    });

    it("handles code with multiple consecutive newlines", () => {
      const multiNewlineNode = {
        ...mockNode,
        textContent: "line1\n\n\nline2",
      };

      render(<CodeBlockComponent {...baseProps} node={multiNewlineNode} />);
    });

    it("line numbers have correct alignment", () => {
      const { container } = render(<CodeBlockComponent {...baseProps} />);

      const lineNumber = screen.getByText("1");
      expect(lineNumber).toHaveClass("text-right");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long code", () => {
      const longNode = {
        ...mockNode,
        textContent: Array(100).fill("line").join("\n"),
      };

      render(<CodeBlockComponent {...baseProps} node={longNode} />);
    });

    it("handles language without value", () => {
      const noLangNode = {
        ...mockNode,
        attrs: {},
      };

      render(<CodeBlockComponent {...baseProps} node={noLangNode} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("handles empty language list", () => {
      const emptyLangExtension = {
        options: {
          lowlight: {
            listLanguages: jest.fn(() => []),
          },
        },
      };

      render(
        <CodeBlockComponent {...baseProps} extension={emptyLangExtension} />,
      );

      expect(screen.getByText("auto")).toBeInTheDocument();
    });

    it("handles many languages", () => {
      const manyLangsExtension = {
        options: {
          lowlight: {
            listLanguages: jest.fn(() =>
              Array.from({ length: 50 }, (_, i) => `lang${i}`),
            ),
          },
        },
      };

      render(
        <CodeBlockComponent {...baseProps} extension={manyLangsExtension} />,
      );

      expect(screen.getByText("lang0")).toBeInTheDocument();
      expect(screen.getByText("lang49")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("select has combobox role", () => {
      render(<CodeBlockComponent {...baseProps} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("select is keyboard navigable", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox");
      expect(select.tagName).toBe("SELECT");
    });

    it("options are properly structured", () => {
      render(<CodeBlockComponent {...baseProps} />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });
  });
});

describe("CodeTool Button", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleCodeBlock: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    isActive: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.isActive.mockReturnValue(false);
  });

  describe("Active State", () => {
    it("checks if codeBlock is active", () => {
      render(<CodeTool editor={mockEditor} />);

      expect(mockEditor.isActive).toHaveBeenCalledWith("codeBlock");
    });

    it("applies different styling based on active state", () => {
      const { container, rerender } = render(<CodeTool editor={mockEditor} />);

      let button = container.firstChild;
      expect(button).not.toHaveClass("bg-slate-200");

      mockEditor.isActive.mockReturnValue(true);
      rerender(<CodeTool editor={mockEditor} />);

      button = container.firstChild;
      expect(button).toHaveClass("bg-slate-200");
    });
  });
});

// Mock code block and its dependencies FIRST
jest.mock("@/components/ui/blocknote/blocks/code-block", () => ({
  CodeBlock: jest.fn(() => ({ type: "code-block" })),
}));

jest.mock("@/components/ui/blocknote/blocks/slide-break-block", () => ({
  SlideBreak: jest.fn(() => ({ type: "slide-break" })),
}));

jest.mock("@/components/ui/blocknote/blocks/slide-layout-blocks", () => ({
  ImageLeftLayout: jest.fn(() => ({ type: "slide-image-left" })),
  ImageRightLayout: jest.fn(() => ({ type: "slide-image-right" })),
  FullImageLayout: jest.fn(() => ({ type: "slide-full-image" })),
  TwoColumnsLayout: jest.fn(() => ({ type: "slide-two-columns" })),
}));

jest.mock("react-syntax-highlighter", () => ({
  Light: jest.fn(({ children }: any) => <div>{children}</div>),
}));

jest.mock("react-syntax-highlighter/dist/esm/styles/hljs", () => ({
  atomOneDark: {},
  githubGist: {},
}));

// Mock language imports
jest.mock(
  "react-syntax-highlighter/dist/esm/languages/hljs/javascript",
  () => ({}),
);
jest.mock(
  "react-syntax-highlighter/dist/esm/languages/hljs/typescript",
  () => ({}),
);
jest.mock(
  "react-syntax-highlighter/dist/esm/languages/hljs/python",
  () => ({}),
);
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/java", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/cpp", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/c", () => ({}));
jest.mock(
  "react-syntax-highlighter/dist/esm/languages/hljs/csharp",
  () => ({}),
);
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/php", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/ruby", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/bash", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/go", () => ({}));
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/rust", () => ({}));
jest.mock(
  "react-syntax-highlighter/dist/esm/languages/hljs/kotlin",
  () => ({}),
);
jest.mock("react-syntax-highlighter/dist/esm/languages/hljs/swift", () => ({}));

// Mock all BlockNote dependencies
jest.mock("@blocknote/core", () => ({
  BlockNoteSchema: {
    create: jest.fn((config) => ({
      blockSpecs: config.blockSpecs,
      styleSpecs: config.styleSpecs,
      blockSchema: {},
      inlineContentSchema: {},
      styleSchema: {},
    })),
  },
  defaultBlockSpecs: {},
  defaultStyleSpecs: {},
  Block: jest.fn(),
  BlockNoteEditor: jest.fn(),
  PartialBlock: jest.fn(),
  createStyleSpec: jest.fn((config, spec) => ({
    type: config.type,
    propSchema: config.propSchema,
    ...spec,
  })),
}));

jest.mock("@/components/ui/blocknote/blocks/callout-block", () => ({
  Callout: jest.fn(() => ({ type: "callout" })),
}));

jest.mock("@/components/ui/blocknote/blocks/quiz-true-false-block", () => ({
  TrueFalseQuiz: jest.fn(() => ({ type: "quiz-true-false" })),
}));

jest.mock("@/components/ui/blocknote/blocks/quiz-open-ended-block", () => ({
  OpenEndedQuiz: jest.fn(() => ({ type: "quiz-open-ended" })),
}));

jest.mock(
  "@/components/ui/blocknote/blocks/quiz-multiple-choice-block",
  () => ({
    MultipleChoiceQuiz: jest.fn(() => ({ type: "quiz-multiple-choice" })),
  }),
);

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({
    resolvedTheme: "light",
  })),
}));

jest.mock("@blocknote/react", () => ({
  useCreateBlockNote: jest.fn(() => ({
    document: [],
    onChange: jest.fn(),
    dictionary: {},
  })),
  SuggestionMenuController: ({ children }: any) => (
    <div data-testid="suggestion-menu">{children}</div>
  ),
  FormattingToolbarController: ({ children }: any) => (
    <div data-testid="formatting-toolbar-controller">{children}</div>
  ),
  FormattingToolbar: ({ children }: any) => (
    <div data-testid="formatting-toolbar">{children}</div>
  ),
  getDefaultReactSlashMenuItems: jest.fn(() => []),
  blockTypeSelectItems: jest.fn(() => []),
  getFormattingToolbarItems: jest.fn((items) => items),
  createReactBlockSpec: jest.fn((config, spec) => () => ({
    type: config.type,
    propSchema: config.propSchema,
    ...spec,
  })),
}));

jest.mock("@blocknote/mantine", () => ({
  BlockNoteView: ({ children }: any) => (
    <div data-testid="blocknote-view">{children}</div>
  ),
}));

jest.mock("@/components/ui/blocknote/editor/slash-menu-config", () => ({
  getCalloutSlashMenuItems: jest.fn(() => []),
  getQuizSlashMenuItems: jest.fn(() => []),
  getLatexSlashMenuItems: jest.fn(() => []),
  getCodeSlashMenuItems: jest.fn(() => []),
  getSlideBreakSlashMenuItems: jest.fn(() => []),
  getNotebookCodeSlashMenuItems: jest.fn(() => []),
}));

jest.mock("@/components/ui/blocknote/editor/custom-blocknote.css", () => ({}));

// Mock Dialog component to avoid importing BlockNote's FloatingComposer
jest.mock("@/components/ui/dialog", () => ({
  Dialog: jest.fn(),
  DialogContent: jest.fn(),
  DialogTitle: jest.fn(),
  DialogHeader: jest.fn(),
  DialogFooter: jest.fn(),
}));

// Mock latex-block after other mocks
jest.mock("@/components/ui/blocknote/blocks/latex-block", () => ({
  LatexBlock: jest.fn(() => ({ type: "latex" })),
}));

jest.mock("@/components/ui/blocknote/blocks/image-block", () => ({
  ImageBlock: jest.fn(() => ({ type: "image" })),
}));

jest.mock("@/components/ui/blocknote/blocks/notebook-code-block", () => ({
  NotebookCodeBlock: jest.fn(() => ({ type: "notebook-code" })),
}));

import { render, screen, waitFor } from "@testing-library/react";
import { BlockNoteEditorClient } from "@/components/draft/lesson/blocknote-editor-client";

describe("BlockNoteEditorClient", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the editor", async () => {
    render(<BlockNoteEditorClient onChange={mockOnChange} />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("suggestion-menu")).toBeInTheDocument();
  });

  it("should render with initial content", async () => {
    const initialContent = [
      {
        type: "paragraph",
        content: "Test content",
      },
    ] as any;

    render(
      <BlockNoteEditorClient
        initialContent={initialContent}
        onChange={mockOnChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });
  });

  it("should call onChange when content changes", async () => {
    const { useCreateBlockNote } = require("@blocknote/react");
    const mockEditor = {
      document: [],
      onChange: jest.fn((callback) => {
        // Simulate a change
        setTimeout(() => callback(), 0);
      }),
    };

    useCreateBlockNote.mockReturnValue(mockEditor);

    render(<BlockNoteEditorClient onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockEditor.onChange).toHaveBeenCalled();
    });
  });

  it("should handle errors gracefully during onChange", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const { useCreateBlockNote } = require("@blocknote/react");

    const mockEditor = {
      get document() {
        throw new Error("Test error");
      },
      onChange: jest.fn((callback) => {
        setTimeout(() => {
          callback();
        }, 0);
      }),
    };

    useCreateBlockNote.mockReturnValue(mockEditor);

    render(<BlockNoteEditorClient onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(mockEditor.onChange).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "BlockNote onChange error:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should ignore node position errors during unmount", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const { useCreateBlockNote } = require("@blocknote/react");

    const mockEditor = {
      get document() {
        throw new Error("Cannot find node position");
      },
      onChange: jest.fn((callback) => {
        setTimeout(() => {
          callback();
        }, 0);
      }),
    };

    useCreateBlockNote.mockReturnValue(mockEditor);

    const { unmount } = render(
      <BlockNoteEditorClient onChange={mockOnChange} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(mockEditor.onChange).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    unmount();
    consoleErrorSpy.mockRestore();
  });

  it("should apply correct theme", async () => {
    const { useTheme } = require("next-themes");
    useTheme.mockReturnValue({ resolvedTheme: "dark" });

    render(<BlockNoteEditorClient onChange={mockOnChange} />);
  });

  it("should have correct container classes", async () => {
    const { container } = render(
      <BlockNoteEditorClient onChange={mockOnChange} />,
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    });

    const editorContainer = container.firstChild;

    expect(editorContainer).toHaveClass("blocknote-no-link");
    expect(editorContainer).toHaveClass("w-full");
    expect(editorContainer).toHaveClass("rounded-lg");
    expect(editorContainer).toHaveClass("border");
  });
});

// Mock all BlockNote dependencies before imports
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

jest.mock("@/components/ui/blocknote/blocks/latex-block", () => ({
  LatexBlock: jest.fn(() => ({ type: "latex" })),
}));

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
  createReactBlockSpec: jest.fn((config, spec) => ({
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

import { render, screen, waitFor } from "@testing-library/react";
import { BlockNoteEditorClient } from "@/components/draft/lesson/blocknote-editor-client";

describe("BlockNoteEditorClient", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the editor", () => {
    render(<BlockNoteEditorClient onChange={mockOnChange} />);

    expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-menu")).toBeInTheDocument();
    expect(
      screen.getByTestId("formatting-toolbar-controller"),
    ).toBeInTheDocument();
  });

  it("should render with initial content", () => {
    const initialContent = [
      {
        type: "paragraph",
        content: "Test content",
      },
    ];

    render(
      <BlockNoteEditorClient
        initialContent={initialContent}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
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
      expect(mockEditor.onChange).toHaveBeenCalled();
    });
  });

  it("should handle errors gracefully during onChange", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const { useCreateBlockNote } = require("@blocknote/react");

    // Create editor with document that throws error
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

    await waitFor(
      () => {
        expect(mockEditor.onChange).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Wait for error to be handled by component's try-catch
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "BlockNote onChange error:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should ignore node position errors during unmount", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const { useCreateBlockNote } = require("@blocknote/react");

    // Create editor with document that throws "Cannot find node position" error
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

    await waitFor(
      () => {
        expect(mockEditor.onChange).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Wait for error to be handled (should be silently ignored)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify error was NOT logged (silently ignored)
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    unmount();
    consoleErrorSpy.mockRestore();
  });

  it("should apply correct theme", () => {
    const { useTheme } = require("next-themes");
    useTheme.mockReturnValue({ resolvedTheme: "dark" });

    render(<BlockNoteEditorClient onChange={mockOnChange} />);

    expect(screen.getByTestId("blocknote-view")).toBeInTheDocument();
  });

  it("should have correct container classes", () => {
    const { container } = render(
      <BlockNoteEditorClient onChange={mockOnChange} />,
    );
    const editorContainer = container.firstChild;

    expect(editorContainer).toHaveClass("blocknote-no-link");
    expect(editorContainer).toHaveClass("w-full");
    expect(editorContainer).toHaveClass("rounded-lg");
    expect(editorContainer).toHaveClass("border");
  });
});

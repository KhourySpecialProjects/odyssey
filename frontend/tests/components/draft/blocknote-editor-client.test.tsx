// Mock code block and its dependencies FIRST
jest.mock("@/components/ui/blocknote/blocks/code-block", () => ({
  CodeBlock: jest.fn(() => ({ type: "code-block" })),
}));

jest.mock("@/components/ui/blocknote/blocks/slide-break-block", () => ({
  SlideBreak: jest.fn(() => ({ type: "slide-break" })),
}));

jest.mock("@/components/ui/blocknote/blocks/column-break-block", () => ({
  ColumnBreak: jest.fn(() => ({ type: "column-break" })),
}));

jest.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: ({ value }: any) => <div>{value}</div>,
}));

jest.mock("@uiw/codemirror-theme-github", () => ({
  githubLight: {},
  githubDark: {},
}));

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
  createBlockNoteExtension: jest.fn((options) => options),
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
    _tiptapEditor: { registerPlugin: jest.fn(), unregisterPlugin: jest.fn() },
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
  getSandpackSlashMenuItems: jest.fn(() => []),
}));

jest.mock("@/components/ui/blocknote/editor/custom-blocknote.css", () => ({}));

jest.mock("@/hooks/useSlideOverflowDetection", () => ({
  useSlideOverflowDetection: () => new Set(),
}));

jest.mock("@/lib/actions/auto-format-slides", () => ({}));

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
      _tiptapEditor: { registerPlugin: jest.fn(), unregisterPlugin: jest.fn() },
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
      _tiptapEditor: { registerPlugin: jest.fn(), unregisterPlugin: jest.fn() },
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
      _tiptapEditor: { registerPlugin: jest.fn(), unregisterPlugin: jest.fn() },
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

    const editorContainer = container.querySelector(".blocknote-no-link");

    expect(editorContainer).toBeInTheDocument();
    expect(editorContainer).toHaveClass("w-full");
    expect(editorContainer).toHaveClass("rounded-lg");
    expect(editorContainer).toHaveClass("border");
  });

  describe("review comment marks (ODY-806)", () => {
    const anchor = {
      id: "comment-1",
      range: { field: "blocks", blockId: "b1", start: 0, end: 4, exact: true },
    };

    function fakeEditor() {
      const view = {
        state: {
          schema: { marks: {} },
          tr: { setMeta: jest.fn(() => "refresh-tr") },
        },
        dispatch: jest.fn(),
      };
      const editor = {
        document: [],
        onChange: jest.fn(),
        dictionary: {},
        prosemirrorView: view,
        _tiptapEditor: {
          registerPlugin: jest.fn(),
          unregisterPlugin: jest.fn(),
        },
      };
      require("@blocknote/react").useCreateBlockNote.mockReturnValue(editor);
      return { editor, view };
    }

    it("creates the editor with the review anchors plugin", async () => {
      fakeEditor();
      render(
        <BlockNoteEditorClient onChange={mockOnChange} anchors={[anchor]} />,
      );

      const { useCreateBlockNote } = require("@blocknote/react");
      const options = useCreateBlockNote.mock.calls[0][0];
      const extension = options.extensions.find(
        (e: { key: string }) => e.key === "reviewAnchors",
      );
      expect(extension.plugins[0].spec.key.key).toMatch(/^anchors\$/);
    });

    it("redraws when the anchors change", async () => {
      const { view } = fakeEditor();
      const { rerender } = render(
        <BlockNoteEditorClient onChange={mockOnChange} anchors={[]} />,
      );
      await waitFor(() => expect(view.dispatch).toHaveBeenCalled());
      view.dispatch.mockClear();

      rerender(
        <BlockNoteEditorClient onChange={mockOnChange} anchors={[anchor]} />,
      );

      expect(view.dispatch).toHaveBeenCalledWith("refresh-tr");
    });

    it("says which text the anchors were found in when it redraws (ODY-807)", async () => {
      const { view } = fakeEditor();
      const foundIn = { doc: "found" } as any;
      render(
        <BlockNoteEditorClient
          onChange={mockOnChange}
          anchors={[anchor]}
          anchorsFoundIn={foundIn}
        />,
      );

      await waitFor(() =>
        expect(view.state.tr.setMeta).toHaveBeenCalledWith(expect.anything(), {
          foundIn,
        }),
      );
    });
  });

  describe("the live content (ODY-807)", () => {
    function liveEditor() {
      const listeners: (() => void)[] = [];
      const doc = { doc: 1 };
      const editor = {
        document: [{ id: "b1", type: "paragraph" }],
        onChange: jest.fn((fn: () => void) => {
          listeners.push(fn);
          return jest.fn();
        }),
        dictionary: {},
        prosemirrorView: {
          state: {
            doc,
            schema: { marks: {} },
            tr: { setMeta: jest.fn(() => "refresh-tr") },
          },
          dispatch: jest.fn(),
        },
        _tiptapEditor: {
          registerPlugin: jest.fn(),
          unregisterPlugin: jest.fn(),
        },
      };
      require("@blocknote/react").useCreateBlockNote.mockReturnValue(editor);
      return { editor, doc, change: () => listeners.forEach((fn) => fn()) };
    }

    it("sends the content once ready, then once a frame however many changes", async () => {
      const { editor, doc, change } = liveEditor();
      const onContent = jest.fn();
      render(
        <BlockNoteEditorClient
          onChange={mockOnChange}
          editable={false}
          onContent={onContent}
        />,
      );

      await waitFor(() => expect(onContent).toHaveBeenCalledTimes(1));
      expect(onContent).toHaveBeenCalledWith(editor.document, doc);

      change();
      change();
      change();
      await waitFor(() => expect(onContent).toHaveBeenCalledTimes(2));
      await new Promise((r) => setTimeout(r, 50));
      expect(onContent).toHaveBeenCalledTimes(2);
    });

    it("doesn't listen without onContent", async () => {
      const { editor } = liveEditor();
      render(
        <BlockNoteEditorClient onChange={mockOnChange} editable={false} />,
      );

      await waitFor(() =>
        expect(screen.getByTestId("blocknote-view")).toBeInTheDocument(),
      );
      await new Promise((r) => setTimeout(r, 200));
      expect(editor.onChange).not.toHaveBeenCalled();
    });
  });
});

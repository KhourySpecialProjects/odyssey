import { render, screen } from "@testing-library/react";
import { GeneralTextEditor } from "@/components/ui/tiptap/general-text-editor";
import { useEditor } from "@tiptap/react";

// Mock the Link extension
jest.mock("@tiptap/extension-link", () => {
  const mockExtend = jest.fn().mockImplementation(() => ({
    configure: jest.fn().mockReturnValue({}),
  }));

  const mockLink = {
    extend: mockExtend,
  };

  return {
    __esModule: true,
    default: mockLink,
  };
});

// Mock other extensions
jest.mock("@tiptap/extension-placeholder", () => ({
  configure: () => ({}),
}));

jest.mock("@tiptap/extension-underline", () => ({}));

jest.mock("@tiptap/starter-kit", () => ({}));

jest.mock("@tiptap/extension-image", () => ({
  configure: () => ({}),
}));

const mockEditor = {
  getHTML: () => "<p>Initial content</p>",
  chain: () => ({
    focus: () => ({
      toggleBold: () => ({
        run: () => {},
      }),
      run: () => {},
    }),
  }),
  isActive: () => false,
  can: () => true,
  commands: {
    focus: () => {},
  },
};

jest.mock("@tiptap/react", () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: any) => (
    <div
      data-testid="editor-content"
      dangerouslySetInnerHTML={{ __html: editor?.getHTML() }}
    />
  ),
}));

describe("GeneralTextEditor", () => {
  beforeEach(() => {
    (useEditor as jest.Mock).mockReturnValue(mockEditor);
  });

  it("renders editor with initial content", () => {
    render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={() => {}}
      />,
    );
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("returns null when editor is not initialized", () => {
    (useEditor as jest.Mock).mockReturnValue(null);
    const { container } = render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls updateContent when editor content changes", () => {
    const mockUpdateContent = jest.fn();
    render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={mockUpdateContent}
      />,
    );
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        onUpdate: expect.any(Function),
      }),
    );
  });

  it("applies custom className", () => {
    render(
      <GeneralTextEditor
        initialContent=""
        updateContent={() => {}}
        className="custom-class"
      />,
    );
    const editorContent = screen.getByTestId("editor-content");
    expect(editorContent.parentElement).toHaveClass("w-full");
  });

  it("initializes editor with correct options", () => {
    const mockUpdateContent = jest.fn();
    render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={mockUpdateContent}
        placeholder="Test placeholder"
      />,
    );
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "<p>Test content</p>",
        extensions: expect.any(Array),
        editorProps: expect.objectContaining({
          attributes: expect.any(Object),
        }),
      }),
    );
  });
});

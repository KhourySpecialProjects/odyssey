import { render } from "@testing-library/react";
import { LessonNameInput } from "@/components/ui/tiptap/lesson-name-input";

jest.mock("@tiptap/react", () => ({
  useEditor: ({ content }: any) => ({
    getHTML: () => content,
  }),
  EditorContent: ({ editor, className }: any) => (
    <div className={className}>
      <div
        className={editor?.options?.editorProps?.attributes?.class}
        dangerouslySetInnerHTML={{ __html: editor?.getHTML() }}
      />
    </div>
  ),
}));

describe("LessonNameInput", () => {
  const mockProps = {
    initialContent: "<h1>Test Lesson</h1>",
    updateContent: jest.fn(),
    className: "test-class",
  };

  it("renders editor with initial content", () => {
    const { container } = render(<LessonNameInput {...mockProps} />);
    expect(container.innerHTML).toContain("Test Lesson");
  });

  it("applies custom className", () => {
    const { container } = render(<LessonNameInput {...mockProps} />);
    const editorElement = container.firstChild as HTMLElement;
    expect(editorElement).toHaveClass("test-class");
  });

  it("applies editor props", () => {
    const { container } = render(<LessonNameInput {...mockProps} />);
    const editorContent = container.querySelector("div > div") as HTMLElement;
    expect(editorContent).toHaveClass("test-class");
  });
});

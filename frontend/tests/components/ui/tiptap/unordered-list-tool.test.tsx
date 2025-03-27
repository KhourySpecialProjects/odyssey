import { render, screen, fireEvent } from "@testing-library/react";
import UnorderedListTool from "@/components/ui/tiptap/toolbar/tools/unordered-list-tool";
import { Editor } from "@tiptap/react";

describe("UnorderedListTool", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleBulletList: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleBulletList: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders unordered list button", () => {
    render(<UnorderedListTool editor={mockEditor} />);
    expect(screen.getByTitle("Unordered list")).toBeInTheDocument();
  });

  it("toggles bullet list when clicked", () => {
    render(<UnorderedListTool editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Unordered list"));

    expect(mockEditor.toggleBulletList).toHaveBeenCalled();
  });

  it("applies active styling when list is active", () => {
    mockEditor.isActive.mockReturnValue(true);
    const { container } = render(<UnorderedListTool editor={mockEditor} />);
    expect(container.firstChild).toHaveClass(
      "bg-slate-200",
      "dark:bg-slate-700",
    );
  });
});

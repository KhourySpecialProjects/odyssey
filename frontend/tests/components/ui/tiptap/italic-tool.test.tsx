import { render, screen, fireEvent } from "@testing-library/react";
import ItalicTool from "@/components/ui/tiptap/toolbar/tools/italic-tool";
import { Editor } from "@tiptap/react";

describe("ItalicTool", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleItalic: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleItalic: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders italic button", () => {
    render(<ItalicTool editor={mockEditor} />);
    expect(screen.getByTitle("Italicize")).toBeInTheDocument();
  });

  it("toggles italic when clicked", () => {
    render(<ItalicTool editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Italicize"));

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockEditor.toggleItalic).toHaveBeenCalled();
    expect(mockEditor.run).toHaveBeenCalled();
  });

  it("applies active styling when italic is active", () => {
    mockEditor.isActive.mockReturnValue(true);
    const { container } = render(<ItalicTool editor={mockEditor} />);

    expect(container.firstChild).toHaveClass(
      "bg-slate-200",
      "dark:bg-slate-700",
    );
  });
});

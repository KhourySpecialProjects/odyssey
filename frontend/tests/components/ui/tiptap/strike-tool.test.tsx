import { render, screen, fireEvent } from "@testing-library/react";
import StrikeTool from "@/components/ui/tiptap/toolbar/tools/strike-tool";
import { Editor } from "@tiptap/react";

describe("StrikeTool", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleStrike: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleStrike: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders strike button", () => {
    render(<StrikeTool editor={mockEditor} />);
    expect(screen.getByTitle("Strikethrough")).toBeInTheDocument();
  });

  it("toggles strike when clicked", () => {
    render(<StrikeTool editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Strikethrough"));

    expect(mockEditor.toggleStrike).toHaveBeenCalled();
  });

  it("applies active styling when strike is active", () => {
    mockEditor.isActive.mockReturnValue(true);
    const { container } = render(<StrikeTool editor={mockEditor} />);
    expect(container.firstChild).toHaveClass(
      "bg-slate-200",
      "dark:bg-slate-700",
    );
  });
});

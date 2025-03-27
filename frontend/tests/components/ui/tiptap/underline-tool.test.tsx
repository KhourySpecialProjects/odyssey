import { render, screen, fireEvent } from "@testing-library/react";
import UnderlineTool from "@/components/ui/tiptap/toolbar/tools/underline-tool";
import { Editor } from "@tiptap/react";

describe("UnderlineTool", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleUnderline: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleUnderline: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders underline button", () => {
    render(<UnderlineTool editor={mockEditor} />);
    expect(screen.getByTitle("Underline")).toBeInTheDocument();
  });

  it("toggles underline when clicked", () => {
    render(<UnderlineTool editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Underline"));

    expect(mockEditor.toggleUnderline).toHaveBeenCalled();
  });

  it("applies active styling when underline is active", () => {
    mockEditor.isActive.mockReturnValue(true);
    const { container } = render(<UnderlineTool editor={mockEditor} />);
    expect(container.firstChild).toHaveClass(
      "bg-slate-200",
      "dark:bg-slate-700",
    );
  });
});

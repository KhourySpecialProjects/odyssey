import { render, screen, fireEvent } from "@testing-library/react";
import LinkToolButton from "@/components/ui/tiptap/toolbar/tools/link-tool";
import { Editor } from "@tiptap/react";

describe("LinkToolButton", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    extendMarkRange: jest.fn().mockReturnThis(),
    setLink: jest.fn().mockReturnThis(),
    unsetLink: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    extendMarkRange: jest.Mock;
    setLink: jest.Mock;
    unsetLink: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders link button", () => {
    render(<LinkToolButton editor={mockEditor} />);
    expect(screen.getByTitle("Link")).toBeInTheDocument();
  });

  it("opens popover when clicked", () => {
    render(<LinkToolButton editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Link"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("inserts link when submitted", () => {
    render(<LinkToolButton editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Link"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByText("Insert"));

    expect(mockEditor.setLink).toHaveBeenCalledWith({
      href: "https://example.com",
    });
  });
});

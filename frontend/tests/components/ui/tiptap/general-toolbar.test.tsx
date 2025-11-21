import { render, screen } from "@testing-library/react";
import GeneralToolbar from "@/components/ui/tiptap/toolbar/general-toolbar";
import { Editor } from "@tiptap/react";

describe("GeneralToolbar", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn(),
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  };

  it("renders basic formatting tools", () => {
    render(<GeneralToolbar editor={mockEditor} />);
    expect(screen.getByTitle("Bold")).toBeInTheDocument();
    expect(screen.getByTitle("Italicize")).toBeInTheDocument();
    expect(screen.getByTitle("Underline")).toBeInTheDocument();
  });

  it("renders extended tools when not in note mode", () => {
    render(<GeneralToolbar editor={mockEditor} note={false} />);
    expect(screen.getByTitle("Code")).toBeInTheDocument();
    expect(screen.getByTitle("Heading 1")).toBeInTheDocument();
  });

  it("hides extended tools in note mode", () => {
    render(<GeneralToolbar editor={mockEditor} note={true} />);
    expect(screen.queryByTitle("Code")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Heading 1")).not.toBeInTheDocument();
  });

  // Note: LaTeX tool removed - LaTeX functionality moved to BlockNote
});

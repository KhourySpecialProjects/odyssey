import { render, screen } from "@testing-library/react";
import { DropletDescriptionInput } from "@/components/ui/tiptap/droplet-description-input";

describe("DropletDescriptionInput", () => {
  const mockProps = {
    initialContent: "",
    updateContent: jest.fn(),
  };

  const otherProps = {
    initialContent: "Test description",
    updateContent: jest.fn(),
  };

  it("renders editor with initial content", () => {
    render(<DropletDescriptionInput {...otherProps} />);
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("applies correct styling", () => {
    const { container } = render(<DropletDescriptionInput {...mockProps} />);
    const editor = container.querySelector(".tiptap");
    expect(editor).toHaveClass("hover:shadow", "focus:shadow-lg");
  });
});

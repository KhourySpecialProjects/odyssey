import { render, screen } from "@testing-library/react";
import { DropletOverviewInput } from "@/components/ui/tiptap/droplet-overview-input";

describe("DropletOverviewInput", () => {
  const mockProps = {
    initialContent: "<p>Test overview</p>",
    updateContent: jest.fn(),
  };

  it("renders editor with initial content", () => {
    render(<DropletOverviewInput {...mockProps} />);
    expect(screen.getByText("Test overview")).toBeInTheDocument();
  });

  it("renders placeholder when empty", () => {
    render(<DropletOverviewInput {...mockProps} initialContent="" />);
    const placeholderElement = screen.getByRole("textbox");
    expect(placeholderElement.querySelector("p")).toHaveAttribute(
      "data-placeholder",
      "Nothing here yet...",
    );
  });
});

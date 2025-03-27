import { render, screen, fireEvent } from "@testing-library/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

describe("Popover", () => {
  const TestPopover = () => (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <p>Test content</p>
      </PopoverContent>
    </Popover>
  );

  it("renders trigger button", () => {
    render(<TestPopover />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("shows content when triggered", () => {
    render(<TestPopover />);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies correct styling to content", () => {
    render(<TestPopover />);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Test content").parentElement).toHaveClass(
      "z-50",
      "rounded-md",
    );
  });
});

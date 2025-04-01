import { render, fireEvent } from "@testing-library/react";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    const { container } = render(<Checkbox />);
    expect(container.firstChild).toHaveAttribute("data-state", "unchecked");
  });

  it("toggles checked state when clicked", () => {
    const { container } = render(<Checkbox />);
    fireEvent.click(container.firstChild as Element);
    expect(container.firstChild).toHaveAttribute("data-state", "checked");
  });

  it("renders in disabled state", () => {
    const { container } = render(<Checkbox disabled />);
    expect(container.firstChild).toHaveClass("disabled:cursor-not-allowed");
  });

  it("calls onCheckedChange handler", () => {
    const handleChange = jest.fn();
    const { container } = render(<Checkbox onCheckedChange={handleChange} />);
    fireEvent.click(container.firstChild as Element);
    expect(handleChange).toHaveBeenCalled();
  });
});

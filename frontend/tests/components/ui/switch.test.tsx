import { render, fireEvent } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("renders switch input", () => {
    const { container } = render(<Switch />);
    expect(
      container.querySelector('input[type="checkbox"]'),
    ).toBeInTheDocument();
  });

  it("handles checked state change", () => {
    const handleChange = jest.fn();
    const { container } = render(<Switch onCheckedChange={handleChange} />);
    const input = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(input);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("applies custom className", () => {
    const { container } = render(<Switch className="test-class" />);
    expect(container.querySelector(".test-class")).toBeInTheDocument();
  });

  it("applies checked styling", () => {
    const { container } = render(<Switch defaultChecked />);
    expect(
      container.querySelector(".peer-checked\\:bg-yellow-500"),
    ).toBeInTheDocument();
  });
});

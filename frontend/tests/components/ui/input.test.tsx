import { render, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders input element", () => {
    const { container } = render(<Input />);
    expect(container.querySelector("input")).toBeInTheDocument();
  });

  it("applies default styling", () => {
    const { container } = render(<Input />);
    expect(container.firstChild).toHaveClass(
      "flex",
      "h-10",
      "w-full",
      "rounded-md",
    );
  });

  it("handles value changes", () => {
    const handleChange = jest.fn();
    const { container } = render(<Input onChange={handleChange} />);
    fireEvent.change(container.firstChild as Element, {
      target: { value: "test" },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it("applies disabled styling", () => {
    const { container } = render(<Input disabled />);
    expect(container.firstChild).toHaveClass("disabled:cursor-not-allowed");
  });
});

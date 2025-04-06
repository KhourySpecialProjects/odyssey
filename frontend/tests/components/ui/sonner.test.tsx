import { render } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";

jest.mock("sonner", () => ({
  Toaster: ({
    className,
    position,
  }: {
    className?: string;
    position?: string;
  }) => (
    <div data-testid="toaster" className={className} data-position={position} />
  ),
}));

describe("Toaster", () => {
  it("renders with default theme", () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId("toaster")).toHaveClass("toaster");
  });

  it("passes custom props to Sonner", () => {
    const { getByTestId } = render(<Toaster position="top-right" />);
    expect(getByTestId("toaster")).toHaveAttribute(
      "data-position",
      "top-right",
    );
  });
});

import { render } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("renders with default value", () => {
    const { container } = render(<Progress value={0} />);
    expect(container.firstChild).toHaveClass("relative", "h-2", "w-full");
  });

  it("shows correct progress value", () => {
    const { container } = render(<Progress value={50} />);
    // Indicator is the direct child of the root (ProgressPrimitive.Indicator)
    const indicator = container.firstChild?.firstChild as HTMLElement;
    expect(indicator).toHaveStyle({ transform: "translateX(-50%)" });
  });

  it("applies custom className", () => {
    const { container } = render(<Progress className="test-class" value={0} />);
    expect(container.firstChild).toHaveClass("test-class");
  });
});

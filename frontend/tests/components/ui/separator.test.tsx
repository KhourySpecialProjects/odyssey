import { render } from "@testing-library/react";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
  it("renders horizontal separator by default", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass("h-[1px]", "w-full");
  });

  it("renders vertical separator", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass("h-full", "w-[1px]");
  });

  it("applies custom className", () => {
    const { container } = render(<Separator className="test-class" />);
    expect(container.firstChild).toHaveClass("test-class");
  });
});

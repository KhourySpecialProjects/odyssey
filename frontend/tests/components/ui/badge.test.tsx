import { Badge } from "@/components/ui/badge";
import { render } from "@testing-library/react";

describe("Badge", () => {
  it("renders with default variant", () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("renders with secondary variant", () => {
    const { container } = render(<Badge variant="secondary">Test</Badge>);
    expect(container.firstChild).toHaveClass("bg-secondary");
    // --secondary is white in dark mode, so the chip needs its own dark fill
    // to keep the white text readable
    expect(container.firstChild).toHaveClass("dark:bg-slate-700");
  });

  it("renders with destructive variant", () => {
    const { container } = render(<Badge variant="destructive">Test</Badge>);
    expect(container.firstChild).toHaveClass("bg-destructive");
  });

  it("renders with outline variant", () => {
    const { container } = render(<Badge variant="outline">Test</Badge>);
    expect(container.firstChild).toHaveClass("text-foreground");
  });

  it("applies additional className", () => {
    const { container } = render(<Badge className="test-class">Test</Badge>);
    expect(container.firstChild).toHaveClass("test-class");
  });
});

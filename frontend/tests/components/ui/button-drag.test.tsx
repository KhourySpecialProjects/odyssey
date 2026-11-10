import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

describe("Button drag (ODY-472)", () => {
  it("is not draggable as a plain button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("draggable", "false");
  });

  it("is not draggable when it wraps a Link", () => {
    render(
      <Button asChild>
        <Link href="/somewhere">Go</Link>
      </Button>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("draggable", "false");
  });
});

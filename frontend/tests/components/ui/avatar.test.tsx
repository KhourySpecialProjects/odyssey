import { render } from "@testing-library/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("renders with default variant and size", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="test.jpg" alt="test" />
        <AvatarFallback>TB</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass("h-16", "w-16", "rounded-md");
  });

  it("renders with round variant", () => {
    const { container } = render(
      <Avatar variant="round">
        <AvatarFallback>TB</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("renders with different sizes", () => {
    const { container } = render(
      <Avatar size="sm">
        <AvatarFallback>TB</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass("h-10", "w-10");
  });

  it("shows fallback when image fails", () => {
    const { getByText } = render(
      <Avatar>
        <AvatarImage src="invalid.jpg" alt="test" />
        <AvatarFallback>TB</AvatarFallback>
      </Avatar>,
    );
    expect(getByText("TB")).toBeInTheDocument();
  });
});

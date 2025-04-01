import { render, fireEvent, screen } from "@testing-library/react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

describe("Sheet", () => {
  const TestSheet = () => (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Test Title</SheetTitle>
          <SheetDescription>Test Description</SheetDescription>
        </SheetHeader>
        <div>Content</div>
        <SheetFooter>Footer</SheetFooter>
      </SheetContent>
    </Sheet>
  );

  it("renders trigger button", () => {
    const { getByText } = render(<TestSheet />);
    expect(getByText("Open")).toBeInTheDocument();
  });

  it("shows content when triggered", () => {
    const { getByText } = render(<TestSheet />);
    fireEvent.click(getByText("Open"));
    expect(getByText("Test Title")).toBeInTheDocument();
    expect(getByText("Test Description")).toBeInTheDocument();
  });
});

describe("Sheet Components", () => {
  describe("SheetTitle", () => {
    it("applies correct default classes and additional classes", () => {
      render(
        <Sheet>
          <SheetTitle className="test-class">Test Title</SheetTitle>
        </Sheet>,
      );

      const title = screen.getByText("Test Title");
      expect(title).toHaveClass(
        "text-lg",
        "font-semibold",
        "text-slate-950",
        "dark:text-slate-50",
        "test-class",
      );
    });
  });
});

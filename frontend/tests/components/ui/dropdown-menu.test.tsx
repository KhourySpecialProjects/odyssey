import { render, screen } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({
  cn: jest.fn((...inputs) => inputs.join(" ")),
}));

describe("DropdownMenuShortcut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has correct displayName", () => {
    expect(DropdownMenuShortcut.displayName).toBe("DropdownMenuShortcut");
  });

  it("renders with default classes", () => {
    render(<DropdownMenuShortcut>⌘+S</DropdownMenuShortcut>);

    const shortcut = screen.getByText("⌘+S");
    expect(shortcut.tagName.toLowerCase()).toBe("span");
    expect(shortcut).toHaveClass("ml-auto text-xs tracking-widest opacity-60");
  });

  it("combines custom className with default classes", () => {
    render(
      <DropdownMenuShortcut className="custom-class">⌘+S</DropdownMenuShortcut>,
    );

    const shortcut = screen.getByText("⌘+S");
    expect(cn).toHaveBeenCalledWith(
      "ml-auto text-xs tracking-widest opacity-60",
      "custom-class",
    );
  });

  it("passes through additional props", () => {
    const props = {
      "data-testid": "shortcut",
      "aria-label": "Save shortcut",
      id: "shortcut-id",
      role: "note",
    };

    render(<DropdownMenuShortcut {...props}>⌘+S</DropdownMenuShortcut>);

    const shortcut = screen.getByTestId("shortcut");
    expect(shortcut).toHaveAttribute("aria-label", "Save shortcut");
    expect(shortcut).toHaveAttribute("id", "shortcut-id");
    expect(shortcut).toHaveAttribute("role", "note");
  });

  it("renders children correctly", () => {
    render(
      <DropdownMenuShortcut>
        <span>⌘</span>
        <span>+</span>
        <span>S</span>
      </DropdownMenuShortcut>,
    );

    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("applies className through cn utility", () => {
    render(
      <DropdownMenuShortcut className="test-class">⌘+S</DropdownMenuShortcut>,
    );

    expect(cn).toHaveBeenCalledTimes(1);
    expect(cn).toHaveBeenCalledWith(
      "ml-auto text-xs tracking-widest opacity-60",
      "test-class",
    );
  });

  it("renders without className", () => {
    render(<DropdownMenuShortcut>⌘+S</DropdownMenuShortcut>);

    expect(cn).toHaveBeenCalledWith(
      "ml-auto text-xs tracking-widest opacity-60",
      undefined,
    );
  });

  it("renders DropdownMenuSeparator with custom className", () => {
    const { container } = render(
      <DropdownMenuSeparator className="custom-class" />,
    );

    const separator = container.firstChild;
    expect(separator).toHaveClass("custom-class");
    expect(separator).toHaveClass("h-px");
  });

  it("exports all required components", () => {
    expect(DropdownMenu).toBeDefined();
    expect(DropdownMenuTrigger).toBeDefined();
    expect(DropdownMenuContent).toBeDefined();
    expect(DropdownMenuLabel).toBeDefined();
    expect(DropdownMenuPortal).toBeDefined();
    expect(DropdownMenuShortcut).toBeDefined();
    expect(DropdownMenuSub).toBeDefined();
    expect(DropdownMenuSubContent).toBeDefined();
    expect(DropdownMenuSubTrigger).toBeDefined();
    expect(DropdownMenuGroup).toBeDefined();
    expect(DropdownMenuRadioGroup).toBeDefined();
    expect(DropdownMenuItem).toBeDefined();
    expect(DropdownMenuSeparator).toBeDefined();
    expect(DropdownMenuRadioItem).toBeDefined();
    expect(DropdownMenuCheckboxItem).toBeDefined();
  });

  it("renders DropdownMenuShortcut with custom className and props", () => {
    const { container } = render(
      <DropdownMenuShortcut className="custom-class" data-testid="shortcut">
        Ctrl+S
      </DropdownMenuShortcut>,
    );

    const shortcut = container.firstChild;
    expect(shortcut).toHaveClass("custom-class");
    expect(shortcut).toHaveClass("ml-auto");
    expect(shortcut).toHaveClass("text-xs");
    expect(shortcut).toHaveTextContent("Ctrl+S");
  });
});

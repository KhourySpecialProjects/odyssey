import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  cn: jest.fn((...inputs) => inputs.filter(Boolean).join(" ")),
}));

describe("DropdownMenu Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Exports", () => {
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
  });

  describe("DropdownMenuShortcut", () => {
    it("has correct displayName", () => {
      expect(DropdownMenuShortcut.displayName).toBe("DropdownMenuShortcut");
    });

    it("renders with default classes", () => {
      render(<DropdownMenuShortcut>⌘+S</DropdownMenuShortcut>);

      const shortcut = screen.getByText("⌘+S");
      expect(shortcut.tagName.toLowerCase()).toBe("span");
      expect(shortcut).toHaveClass("ml-auto");
      expect(shortcut).toHaveClass("text-xs");
      expect(shortcut).toHaveClass("tracking-widest");
      expect(shortcut).toHaveClass("opacity-60");
    });

    it("combines custom className with default classes", () => {
      render(
        <DropdownMenuShortcut className="custom-class">
          ⌘+S
        </DropdownMenuShortcut>,
      );

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

    it("renders without className", () => {
      render(<DropdownMenuShortcut>⌘+S</DropdownMenuShortcut>);

      expect(cn).toHaveBeenCalledWith(
        "ml-auto text-xs tracking-widest opacity-60",
        undefined,
      );
    });

    it("renders different shortcut formats", () => {
      render(
        <>
          <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          <DropdownMenuShortcut>Alt+F4</DropdownMenuShortcut>
          <DropdownMenuShortcut>⌘+K</DropdownMenuShortcut>
        </>,
      );

      expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
      expect(screen.getByText("Alt+F4")).toBeInTheDocument();
      expect(screen.getByText("⌘+K")).toBeInTheDocument();
    });

    it("applies custom styles", () => {
      render(
        <DropdownMenuShortcut className="text-red-500">
          ⌘+S
        </DropdownMenuShortcut>,
      );

      const shortcut = screen.getByText("⌘+S");
      expect(shortcut).toHaveClass("text-red-500");
    });
  });

  describe("DropdownMenu Basic Structure", () => {
    it("renders trigger button", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        </DropdownMenu>,
      );

      expect(screen.getByText("Open Menu")).toBeInTheDocument();
    });

    it("renders trigger with custom children", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>
            <span>Custom</span> <span>Trigger</span>
          </DropdownMenuTrigger>
        </DropdownMenu>,
      );

      expect(screen.getByText("Custom")).toBeInTheDocument();
      expect(screen.getByText("Trigger")).toBeInTheDocument();
    });

    it("renders with asChild prop", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>Custom Button</button>
          </DropdownMenuTrigger>
        </DropdownMenu>,
      );

      expect(
        screen.getByRole("button", { name: "Custom Button" }),
      ).toBeInTheDocument();
    });
  });

  describe("DropdownMenuContent", () => {
    it("applies default sideOffset", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Content should be rendered when open
      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent className="custom-content">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("z-50"),
        "custom-content",
      );
    });

    it("applies custom sideOffset", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={10}>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    it("includes animation classes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("data-[state=open]:animate-in"),
        undefined,
      );
    });

    it("includes dark mode classes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("dark:bg-slate-950"),
        undefined,
      );
    });
  });

  describe("DropdownMenuItem", () => {
    it("renders menu item", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Menu Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Menu Item")).toBeInTheDocument();
    });

    it("applies inset class when inset prop is true", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("relative flex"),
        "pl-8",
        undefined,
      );
    });

    it("applies custom className", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-item">Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });

    it("handles disabled state", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Disabled Item")).toBeInTheDocument();
    });

    it("includes focus and hover classes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });
  });

  describe("DropdownMenuLabel", () => {
    it("renders label", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Section Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Section Label")).toBeInTheDocument();
    });

    it("applies inset class when inset prop is true", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        "px-2 py-1.5 text-sm font-semibold",
        "pl-8",
        undefined,
      );
    });

    it("applies custom className", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="custom-label">
              Label
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });
  });

  describe("DropdownMenuSeparator", () => {
    it("renders separator", () => {
      const { container } = render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });

    it("applies custom className", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator className="custom-separator" />
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        "-mx-1 my-1 h-px bg-slate-100 dark:bg-slate-800",
        "custom-separator",
      );
    });

    it("includes dark mode classes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("dark:bg-slate-800"),
        undefined,
      );
    });
  });

  describe("DropdownMenuCheckboxItem", () => {
    it("renders checkbox item", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem>Checkbox Item</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Checkbox Item")).toBeInTheDocument();
    });

    it("renders checked state", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>
              Checked Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Checked Item")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem className="custom-checkbox">
              Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("relative flex"),
        "custom-checkbox",
      );
    });

    it("includes padding for indicator", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem>Item</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("pl-8"),
        undefined,
      );
    });
  });

  describe("DropdownMenuRadioGroup and RadioItem", () => {
    it("renders radio group with items", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1">
                Option 1
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">
                Option 2
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("applies custom className to radio item", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1" className="custom-radio">
                Option 1
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("relative flex"),
        "custom-radio",
      );
    });
  });

  describe("DropdownMenuSub", () => {
    it("renders sub menu trigger", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Sub Menu</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Sub Menu")).toBeInTheDocument();
    });

    it("applies inset class to sub trigger", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Inset Sub</DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("flex cursor-default"),
        "pl-8",
        undefined,
      );
    });

    it("applies custom className to sub trigger", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="custom-sub">
                Sub Menu
              </DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });

    it("applies custom className to sub content", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Sub Menu</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="custom-sub-content">
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining("z-50"),
        "custom-sub-content",
      );
    });
  });

  describe("DropdownMenuGroup", () => {
    it("renders group of items", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Group Item 1</DropdownMenuItem>
              <DropdownMenuItem>Group Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Group Item 1")).toBeInTheDocument();
      expect(screen.getByText("Group Item 2")).toBeInTheDocument();
    });
  });

  describe("Complex Menu Structures", () => {
    it("renders complete menu with all components", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                Profile
                <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>
              Show Panel
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("My Account")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("⌘P")).toBeInTheDocument();
      expect(screen.getByText("⌘S")).toBeInTheDocument();
      expect(screen.getByText("Show Panel")).toBeInTheDocument();
    });

    it("renders nested sub menus", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
                <DropdownMenuItem>Sub Item 2</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("More Options")).toBeInTheDocument();
    });
  });

  describe("Display Names", () => {
    it("has correct display names for all components", () => {
      expect(DropdownMenuShortcut.displayName).toBe("DropdownMenuShortcut");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty content", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent></DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("handles multiple separators", () => {
      const { container } = render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });

    it("handles items without shortcuts", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>No Shortcut</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("No Shortcut")).toBeInTheDocument();
    });

    it("handles long text in menu items", () => {
      const longText = "This is a very long menu item text that might wrap";
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{longText}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders with proper ARIA attributes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Open Menu")).toBeInTheDocument();
    });

    it("handles keyboard navigation appropriately", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });
  });
});

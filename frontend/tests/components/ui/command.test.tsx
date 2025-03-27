import { render, screen } from "@testing-library/react";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import userEvent from "@testing-library/user-event";

// Mock the cmdk Command component and its subcomponents
jest.mock("cmdk", () => {
  const CommandComponent = ({ children, className, ...props }: any) => (
    <div data-testid="cmdk-command" className={className} {...props}>
      {children}
    </div>
  );

  CommandComponent.Input = ({ className, ...props }: any) => (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <input data-testid="cmdk-input" className={className} {...props} />
    </div>
  );

  CommandComponent.List = ({ className, children, ...props }: any) => (
    <div data-testid="cmdk-list" className={className} {...props}>
      {children}
    </div>
  );

  CommandComponent.Empty = ({ children, ...props }: any) => (
    <div data-testid="cmdk-empty" {...props}>
      {children}
    </div>
  );

  CommandComponent.Group = ({ children, ...props }: any) => (
    <div data-testid="cmdk-group" {...props}>
      {children}
    </div>
  );

  CommandComponent.Item = ({ children, ...props }: any) => (
    <div data-testid="cmdk-item" {...props}>
      {children}
    </div>
  );

  CommandComponent.Separator = (props: any) => (
    <div data-testid="cmdk-separator" {...props} />
  );

  return {
    Command: CommandComponent,
  };
});

// Mock Dialog components
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, ...props }: any) => (
    <div data-testid="dialog-title" {...props}>
      {children}
    </div>
  ),
}));

describe("Command Components", () => {
  describe("Command", () => {
    it("renders with correct classes and content", () => {
      const { container } = render(
        <Command className="test-class">
          <div>Test content</div>
        </Command>,
      );

      expect(screen.getByTestId("cmdk-command")).toHaveClass(
        "flex",
        "h-full",
        "w-full",
        "flex-col",
        "test-class",
      );
      expect(container).toHaveTextContent("Test content");
    });
  });

  describe("CommandDialog", () => {
    it("renders dialog with command component", () => {
      render(
        <CommandDialog open>
          <div>Dialog content</div>
        </CommandDialog>,
      );

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
      expect(screen.getByText("Dialog content")).toBeInTheDocument();
    });
  });

  describe("CommandInput", () => {
    it("renders input with search icon", async () => {
      render(<CommandInput placeholder="Search..." />);

      const input = screen.getByTestId("cmdk-input");
      expect(input).toHaveAttribute("placeholder", "Search...");
    });
  });

  describe("CommandList", () => {
    it("renders list with correct classes", () => {
      render(
        <CommandList className="test-class">
          <div>List content</div>
        </CommandList>,
      );

      const list = screen.getByTestId("cmdk-list");
      expect(list).toHaveClass(
        "max-h-[300px]",
        "overflow-y-auto",
        "test-class",
      );
      expect(list).toHaveTextContent("List content");
    });
  });

  describe("CommandEmpty", () => {
    it("renders empty state with correct classes", () => {
      render(<CommandEmpty>No results</CommandEmpty>);

      const empty = screen.getByTestId("cmdk-empty");
      expect(empty).toHaveClass("py-6", "text-center", "text-sm");
      expect(empty).toHaveTextContent("No results");
    });
  });

  describe("CommandGroup", () => {
    it("renders group with correct classes and content", () => {
      render(
        <CommandGroup className="test-class">
          <div>Group content</div>
        </CommandGroup>,
      );

      const group = screen.getByTestId("cmdk-group");
      expect(group).toHaveClass("overflow-hidden", "p-1", "test-class");
      expect(group).toHaveTextContent("Group content");
    });
  });

  describe("CommandItem", () => {});

  describe("CommandSeparator", () => {
    it("renders separator with correct classes", () => {
      render(<CommandSeparator className="test-class" />);

      const separator = screen.getByTestId("cmdk-separator");
      expect(separator).toHaveClass("-mx-1", "h-px", "test-class");
    });
  });

  describe("CommandShortcut", () => {
    it("renders shortcut with correct classes", () => {
      render(<CommandShortcut className="test-class">⌘K</CommandShortcut>);

      const shortcut = screen.getByText("⌘K");
      expect(shortcut).toHaveClass(
        "ml-auto",
        "text-xs",
        "tracking-widest",
        "test-class",
      );
    });
  });

  // Test component integration
  describe("Command Integration", () => {
    it("renders full command interface correctly", () => {
      render(
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              <CommandItem>Item 1</CommandItem>
              <CommandSeparator />
              <CommandItem>Item 2</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>,
      );

      expect(screen.getByTestId("cmdk-input")).toBeInTheDocument();
      expect(screen.getByTestId("cmdk-list")).toBeInTheDocument();
      expect(screen.getByText("No results found")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByTestId("cmdk-separator")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });
  });
});

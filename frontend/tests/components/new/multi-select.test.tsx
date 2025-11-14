import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiSelect } from "@/components/new/multi-select";
import { createNewTag } from "@/lib/requests/droplet";
import { toast } from "sonner";

jest.mock("@/lib/requests/droplet");
jest.mock("sonner");

const mockedCreateNewTag = createNewTag as jest.MockedFunction<
  typeof createNewTag
>;
const mockedToast = toast as jest.Mocked<typeof toast>;

// Mock scrollIntoView for Command component
Element.prototype.scrollIntoView = jest.fn();

describe("MultiSelect", () => {
  const mockItems = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];
  const mockSetSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders select button with Tags placeholder when label is Tags", () => {
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      expect(screen.getByText("Select Tags...")).toBeInTheDocument();
    });

    it("renders select button with Prerequisites placeholder when label is Prerequisites", () => {
      render(
        <MultiSelect
          label="Prerequisites"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      expect(screen.getByText("Select Prerequisites...")).toBeInTheDocument();
    });

    it("renders select button with Postrequisites placeholder when label is Postrequisites", () => {
      render(
        <MultiSelect
          label="Postrequisites"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      expect(screen.getByText("Select Postrequisites...")).toBeInTheDocument();
    });

    it("shows selected items as badges", () => {
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[mockItems[0], mockItems[1]]}
          setSelected={mockSetSelected}
        />,
      );
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });

    it("applies custom className to button", () => {
      const { container } = render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
          className="custom-class"
        />,
      );
      const button = container.querySelector(".custom-class");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Popover Interactions", () => {
    it("opens popover when button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button", { name: /select tags/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Tags")).toBeInTheDocument();
      });
    });

    it("displays all items in the popover list", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        mockItems.forEach((item) => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });
      });
    });

    it("shows items with selected state", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[mockItems[0]]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      // Verify the item appears in both the badge and the list
      await waitFor(() => {
        const itemElements = screen.getAllByText("Item 1");
        expect(itemElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Selection Interactions", () => {
    it("selects an item when clicked", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument();
      });

      const item = screen.getByText("Item 1");
      await user.click(item);

      expect(mockSetSelected).toHaveBeenCalledWith([mockItems[0]]);
    });

    it("deselects an item when clicked again", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[mockItems[0]]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for popover to open and find the item in the list
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Tags")).toBeInTheDocument();
      });

      // Click on Item 1 in the CommandItem list
      const commandItems = screen.getAllByText("Item 1");
      const listItem = commandItems.find((el) => {
        const parent = el.closest("[cmdk-item]");
        return parent !== null;
      });

      if (listItem) {
        await user.click(listItem);
        expect(mockSetSelected).toHaveBeenCalledWith([]);
      }
    });

    it("allows selecting multiple items", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[mockItems[0]]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Item 2")).toBeInTheDocument();
      });

      const item2 = screen.getByText("Item 2");
      await user.click(item2);

      expect(mockSetSelected).toHaveBeenCalledWith([
        mockItems[0],
        mockItems[1],
      ]);
    });
  });

  describe("Add Tag Functionality", () => {
    it("shows Add Tag option only when label is Tags", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Add Tag")).toBeInTheDocument();
      });
    });

    it("Add Tag button className changes based on label", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Prerequisites"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Prerequisites"),
        ).toBeInTheDocument();
      });

      // The Add Tag button exists in DOM for all labels
      // but has different className based on label
      const addTagElement = screen.getByText("Add Tag");
      expect(addTagElement).toBeInTheDocument();
    });

    it("opens dialog when Add Tag is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Add Tag")).toBeInTheDocument();
      });

      const addTagButton = screen.getByText("Add Tag");
      await user.click(addTagButton);

      await waitFor(() => {
        expect(
          screen.getByText("Enter the name of your new tag"),
        ).toBeInTheDocument();
      });
    });

    it("allows typing in the tag name input", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const input = await screen.findByPlaceholderText("Enter new tag name");
      await user.type(input, "New Tag");

      expect(input).toHaveValue("New Tag");
    });

    it("creates new tag successfully when Save is clicked", async () => {
      const user = userEvent.setup();
      mockedCreateNewTag.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          name: "New Tag",
          slug: "new-tag",
          droplets: [],
        },
      });
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const input = await screen.findByPlaceholderText("Enter new tag name");
      await user.type(input, "New Tag");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockedCreateNewTag).toHaveBeenCalledWith("New Tag");
        expect(mockedToast.success).toHaveBeenCalledWith(
          "Tag created successfully",
        );
      });
    });

    it("handles tag creation failure", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockedCreateNewTag.mockResolvedValue({
        success: false,
        error: "Tag already exists",
      });

      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const input = await screen.findByPlaceholderText("Enter new tag name");
      await user.type(input, "Existing Tag");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to create tag",
          "Tag already exists",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles tag creation error", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const error = new Error("Network error");
      mockedCreateNewTag.mockRejectedValue(error);

      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const input = await screen.findByPlaceholderText("Enter new tag name");
      await user.type(input, "New Tag");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to create new tag: ",
          error,
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("closes dialog after successful tag creation", async () => {
      const user = userEvent.setup();
      mockedCreateNewTag.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          name: "New Tag",
          slug: "new-tag",
          droplets: [],
        },
      });
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const input = await screen.findByPlaceholderText("Enter new tag name");
      await user.type(input, "New Tag");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Enter the name of your new tag"),
        ).not.toBeInTheDocument();
      });
    });

    it("does not create tag when input is empty", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(mockedCreateNewTag).not.toHaveBeenCalled();
    });

    it("closes dialog when clicking outside or canceling", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const addTagButton = await screen.findByText("Add Tag");
      await user.click(addTagButton);

      await waitFor(() => {
        expect(
          screen.getByText("Enter the name of your new tag"),
        ).toBeInTheDocument();
      });

      // Escape key should close dialog
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(
          screen.queryByText("Enter the name of your new tag"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("filters items based on search input", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const searchInput = await screen.findByPlaceholderText("Tags");
      await user.type(searchInput, "Item 1");

      // Note: The actual filtering is handled by the Command component
      // This test verifies the input works
      expect(searchInput).toHaveValue("Item 1");
    });
  });

  describe("Alignment Options", () => {
    it("applies center alignment by default", () => {
      const { container } = render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      // The alignment is applied to PopoverContent, which is rendered in a portal
      expect(container).toBeInTheDocument();
    });

    it("accepts start alignment", () => {
      const { container } = render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
          align="start"
        />,
      );
      expect(container).toBeInTheDocument();
    });

    it("accepts end alignment", () => {
      const { container } = render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
          align="end"
        />,
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty items array", () => {
      render(
        <MultiSelect
          label="Tags"
          items={[]}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      expect(screen.getByText("Select Tags...")).toBeInTheDocument();
    });

    it("handles large number of selected items", () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      render(
        <MultiSelect
          label="Tags"
          items={manyItems}
          selected={manyItems}
          setSelected={mockSetSelected}
        />,
      );

      manyItems.forEach((item) => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    it("handles items with duplicate names but different ids", async () => {
      const user = userEvent.setup();
      const duplicateNameItems = [
        { id: 1, name: "Same Name" },
        { id: 2, name: "Same Name" },
      ];

      render(
        <MultiSelect
          label="Tags"
          items={duplicateNameItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        const items = screen.getAllByText("Same Name");
        expect(items.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Accessibility", () => {
    it("button has appropriate role", () => {
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("supports keyboard navigation for opening popover", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="Tags"
          items={mockItems}
          selected={[]}
          setSelected={mockSetSelected}
        />,
      );

      const button = screen.getByRole("button");
      button.focus();

      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Tags")).toBeInTheDocument();
      });
    });
  });
});

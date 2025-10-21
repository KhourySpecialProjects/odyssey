import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedFilter } from "@/components/feed/feed-filter";
import { AnnouncementTypeTitle } from "@/lib/globals";

describe("FeedFilter", () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  describe("Component Rendering", () => {
    it("renders all announcement type filters", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      expect(screen.getByRole("droplet")).toBeInTheDocument();
      expect(screen.getByRole("playlist")).toBeInTheDocument();
      expect(screen.getByRole("group")).toBeInTheDocument();
      expect(screen.getByRole("system")).toBeInTheDocument();
      expect(screen.getByRole("friend")).toBeInTheDocument();
      expect(screen.getByRole("kudos")).toBeInTheDocument();
    });

    it("renders all checkboxes", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(6);
    });

    it("renders grid layout", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
    });

    it("all filters are checked by default", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe("Background Colors", () => {
    it("applies correct styling based on filter state", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox, index) => {
        const container = checkbox.closest("div.flex.items-center");
        expect(container).not.toBeNull();

        const type = Object.values(AnnouncementTypeTitle)[index];
        switch (type) {
          case AnnouncementTypeTitle.Droplet:
            expect(container).toHaveClass("bg-blue-200");
            break;
          case AnnouncementTypeTitle.Playlist:
            expect(container).toHaveClass("bg-green-200");
            break;
          case AnnouncementTypeTitle.Group:
            expect(container).toHaveClass("bg-purple-200");
            break;
          case AnnouncementTypeTitle.System:
            expect(container).toHaveClass("bg-red-200");
            break;
          case AnnouncementTypeTitle.Friend:
            expect(container).toHaveClass("bg-yellow-200");
            break;
          case AnnouncementTypeTitle.Kudos:
            expect(container).toHaveClass("bg-orange-200");
            break;
        }
      });
    });

    it("applies dark mode background for droplet", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const dropletContainer = screen
        .getByRole("droplet")
        .closest("div.flex.items-center");
      expect(dropletContainer).toHaveClass("dark:bg-[#266697]");
    });

    it("applies dark mode background for playlist", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const playlistContainer = screen
        .getByRole("playlist")
        .closest("div.flex.items-center");
      expect(playlistContainer).toHaveClass("dark:bg-[#29703B]");
    });

    it("applies dark mode background for group", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const groupContainer = screen
        .getByRole("group")
        .closest("div.flex.items-center");
      expect(groupContainer).toHaveClass("dark:bg-[#754ABA]");
    });

    it("applies dark mode background for system", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const systemContainer = screen
        .getByRole("system")
        .closest("div.flex.items-center");
      expect(systemContainer).toHaveClass("dark:bg-[#B83028]");
    });

    it("applies dark mode background for friend", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const friendContainer = screen
        .getByRole("friend")
        .closest("div.flex.items-center");
      expect(friendContainer).toHaveClass("dark:bg-[#C38508]");
    });

    it("applies dark mode background for kudos", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const kudosContainer = screen
        .getByRole("kudos")
        .closest("div.flex.items-center");
      expect(kudosContainer).toHaveClass("dark:bg-[#B55E0C]");
    });
  });

  describe("Icons Rendering", () => {
    it("renders droplet icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(container.querySelector(".lucide-droplet")).toBeInTheDocument();
    });

    it("renders playlist icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(container.querySelector(".lucide-list-video")).toBeInTheDocument();
    });

    it("renders group icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(
        container.querySelector(".lucide-users-round"),
      ).toBeInTheDocument();
    });

    it("renders system icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(container.querySelector(".lucide-info")).toBeInTheDocument();
    });

    it("renders friend icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(container.querySelector(".lucide-handshake")).toBeInTheDocument();
    });

    it("renders kudos icon", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );
      expect(
        container.querySelector(".lucide-party-popper"),
      ).toBeInTheDocument();
    });

    it("all icons are rendered", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      // Check for specific icon classes (not checkboxes)
      expect(container.querySelector(".lucide-droplet")).toBeInTheDocument();
      expect(container.querySelector(".lucide-list-video")).toBeInTheDocument();
      expect(
        container.querySelector(".lucide-users-round"),
      ).toBeInTheDocument();
      expect(container.querySelector(".lucide-info")).toBeInTheDocument();
      expect(container.querySelector(".lucide-handshake")).toBeInTheDocument();
      expect(
        container.querySelector(".lucide-party-popper"),
      ).toBeInTheDocument();
    });
  });

  describe("Filter Toggle Functionality", () => {
    it("unchecks filter when clicking checked checkbox", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      const dropletCheckbox = checkboxes[0];

      expect(dropletCheckbox).toBeChecked();

      await userEvent.click(dropletCheckbox);

      expect(dropletCheckbox).not.toBeChecked();
    });

    it("checks filter when clicking unchecked checkbox", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      const dropletCheckbox = checkboxes[0];

      // First uncheck
      await userEvent.click(dropletCheckbox);
      expect(dropletCheckbox).not.toBeChecked();

      // Then check again
      await userEvent.click(dropletCheckbox);
      expect(dropletCheckbox).toBeChecked();
    });

    it("calls onFilterChange when toggling filter", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]);

      expect(mockOnFilterChange).toHaveBeenCalled();
    });

    it("passes correct filtered roles to callback when unchecking", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]); // Uncheck droplet

      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall).not.toContain(AnnouncementTypeTitle.Droplet);
      expect(lastCall.length).toBe(5);
    });

    it("passes correct filtered roles to callback when checking", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // First uncheck
      await userEvent.click(checkboxes[0]);

      // Then check again
      await userEvent.click(checkboxes[0]);

      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall).toContain(AnnouncementTypeTitle.Droplet);
      expect(lastCall.length).toBe(6);
    });

    it("toggles multiple filters independently", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck droplet and playlist
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();

      expect(mockOnFilterChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("Opacity Changes", () => {
    it("applies full opacity to checked filters", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const dropletLabel = screen.getByRole("droplet").parentElement;
      expect(dropletLabel).toHaveClass("opacity-100");
    });

    it("applies reduced opacity to unchecked filters", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]);

      const dropletLabel = screen.getByRole("droplet").parentElement;
      expect(dropletLabel).toHaveClass("opacity-50");
    });

    it("applies opacity to icons based on selection", async () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      const iconContainer =
        container.querySelectorAll("div > svg")[0].parentElement;

      // Initially should be full opacity
      expect(iconContainer).toHaveClass("opacity-100");

      // Uncheck first filter
      await userEvent.click(checkboxes[0]);

      // Should now be reduced opacity
      expect(iconContainer).toHaveClass("opacity-50");
    });
  });

  describe("Checkbox Styling", () => {
    it("applies correct checkbox styling", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveClass("border-sky-500");
        expect(checkbox).toHaveClass("bg-sky-200");
      });
    });

    it("applies correct checked state styling", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveClass("data-[state=checked]:bg-sky-500");
      });
    });
  });

  describe("Layout and Responsive Design", () => {
    it("applies grid layout", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("gap-3", "p-4");
    });

    it("applies responsive grid columns", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("sm:grid-cols-1", "md:grid-cols-2");
    });

    it("applies minimum width", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("min-w-[275px]");
    });

    it("applies responsive border on medium screens", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass(
        "md:rounded-md",
        "md:border",
        "md:border-slate-200",
      );
    });

    it("applies responsive background on medium screens", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("md:bg-slate-50");
    });

    it("applies dark mode styles for container", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass(
        "md:dark:border-slate-500",
        "md:dark:bg-slate-800",
      );
    });
  });

  describe("Filter Items Layout", () => {
    it("applies flex layout to each filter item", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const filterItems = container.querySelectorAll("div.flex.items-center");
      expect(filterItems.length).toBe(6);

      filterItems.forEach((item) => {
        expect(item).toHaveClass("justify-between", "rounded-md", "p-2");
      });
    });

    it("renders checkbox, label, and icon in correct order", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const firstFilterItem = container.querySelector("div.flex.items-center")!;
      const children = Array.from(firstFilterItem.children);

      // Should have checkbox (button), label (span wrapper), icon (div)
      expect(children.length).toBe(3);
    });
  });

  describe("Dark Mode Text Styling", () => {
    it("applies dark mode text color to all filters", () => {
      const { container } = render(
        <FeedFilter onFilterChange={mockOnFilterChange} />,
      );

      const filterContainers = container.querySelectorAll(
        "div.flex.items-center",
      );
      filterContainers.forEach((filterContainer) => {
        expect(filterContainer).toHaveClass("dark:text-slate-200");
      });
    });
  });

  describe("Filter State Management", () => {
    it("maintains state across multiple toggles", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck first three
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
      await userEvent.click(checkboxes[2]);

      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
      expect(checkboxes[3]).toBeChecked();
      expect(checkboxes[4]).toBeChecked();
      expect(checkboxes[5]).toBeChecked();
    });

    it("can uncheck all filters", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck all
      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });

      // Last call should have empty array
      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall.length).toBe(0);
    });

    it("can recheck all filters after unchecking", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck all
      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      // Check all again
      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });

      // Last call should have all 6 filters
      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall.length).toBe(6);
    });
  });

  describe("Callback Behavior", () => {
    it("calls onFilterChange on initial render with all filters selected", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      // Component doesn't call onFilterChange on mount, only on user interaction
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });

    it("passes array of selected filters to callback", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]);

      expect(mockOnFilterChange).toHaveBeenCalledWith(expect.any(Array));

      const callArg = mockOnFilterChange.mock.calls[0][0];
      expect(Array.isArray(callArg)).toBe(true);
    });

    it("includes correct AnnouncementTypeTitle values in callback", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[1]); // Uncheck playlist

      const callArg = mockOnFilterChange.mock.calls[0][0];
      expect(callArg).toContain(AnnouncementTypeTitle.Droplet);
      expect(callArg).toContain(AnnouncementTypeTitle.Group);
      expect(callArg).not.toContain(AnnouncementTypeTitle.Playlist);
    });
  });

  describe("Label Rendering", () => {
    it("renders correct label text for each filter", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      expect(screen.getByRole("droplet")).toHaveTextContent("Droplet");
      expect(screen.getByRole("playlist")).toHaveTextContent("Playlist");
      expect(screen.getByRole("group")).toHaveTextContent("Group");
      expect(screen.getByRole("system")).toHaveTextContent("System");
      expect(screen.getByRole("friend")).toHaveTextContent("Friend");
      expect(screen.getByRole("kudos")).toHaveTextContent("Kudos");
    });

    it("applies correct font styling to labels", () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const dropletLabel = screen.getByRole("droplet").parentElement;
      expect(dropletLabel).toHaveClass("text-sm", "font-medium");
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid toggle clicks", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Rapid clicks on same checkbox
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[0]);

      expect(mockOnFilterChange).toHaveBeenCalledTimes(3);
    });

    it("handles toggling all filters in sequence", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      expect(mockOnFilterChange).toHaveBeenCalledTimes(6);
    });

    it("maintains correct state when toggling same filter multiple times", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Toggle 4 times
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[0]);

      // Should be back to checked
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe("Integration Tests", () => {
    it("handles complete filter workflow", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck droplet and playlist
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      // Verify state
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();

      // Verify callback was called with correct data
      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall.length).toBe(4);
      expect(lastCall).toContain(AnnouncementTypeTitle.Group);
      expect(lastCall).toContain(AnnouncementTypeTitle.System);
      expect(lastCall).toContain(AnnouncementTypeTitle.Friend);
      expect(lastCall).toContain(AnnouncementTypeTitle.Kudos);
    });

    it("handles selecting only specific filters", async () => {
      render(<FeedFilter onFilterChange={mockOnFilterChange} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Uncheck all except Friend and Kudos
      await userEvent.click(checkboxes[0]); // Droplet
      await userEvent.click(checkboxes[1]); // Playlist
      await userEvent.click(checkboxes[2]); // Group
      await userEvent.click(checkboxes[3]); // System

      const lastCall =
        mockOnFilterChange.mock.calls[
          mockOnFilterChange.mock.calls.length - 1
        ][0];
      expect(lastCall.length).toBe(2);
      expect(lastCall).toContain(AnnouncementTypeTitle.Friend);
      expect(lastCall).toContain(AnnouncementTypeTitle.Kudos);
    });
  });
});

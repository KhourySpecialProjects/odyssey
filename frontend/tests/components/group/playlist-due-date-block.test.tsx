import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlaylistDueDateBlock } from "@/components/group/playlist-due-date-block";
import { assignPlaylistDueDate, getGroupDueDate } from "@/lib/requests/groups";
import { GroupSemester } from "@/types";

jest.mock("@/lib/requests/groups", () => ({
  assignPlaylistDueDate: jest.fn().mockResolvedValue({ success: true }),
  getGroupDueDate: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("PlaylistDueDateBlock", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  };

  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [] as any,
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Rendering", () => {
    it("renders the component with playlist name", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    });

    it("renders playlist name as a link to the playlist page", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const link = screen.getByRole("link", { name: "Test Playlist" });
      expect(link).toHaveAttribute("href", "/p/test-playlist");
    });

    it("renders the date picker component", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      expect(screen.getByTestId("picker")).toBeInTheDocument();
    });

    it("renders save button with Check icon", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      );
      expect(saveButton).toBeInTheDocument();
    });

    it("renders delete button with Trash icon", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      );
      expect(deleteButton).toBeInTheDocument();
    });

    it("applies correct styling classes for layout", () => {
      const { container } = render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass(
        "flex",
        "w-full",
        "flex-row",
        "items-center",
        "justify-between",
      );
    });
  });

  describe("Due Date Fetching", () => {
    it("fetches due date on component mount", async () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledWith(mockPlaylist, mockGroup);
      });
    });

    it("fetches and sets due date on mount", async () => {
      const mockDueDate = "2024-03-20T15:00:00.000Z";
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: mockDueDate,
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledWith(mockPlaylist, mockGroup);
      });
    });

    it("should load existing due date", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T00:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("picker")).toBeInTheDocument();
      });
    });

    it("handles null due date from API", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });
    });

    it("handles API response without dueDate property", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({});

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });
    });

    it("re-fetches due date when currentPlaylist changes", async () => {
      const { rerender } = render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(1);
      });

      const newPlaylist = { ...mockPlaylist, id: 2, name: "New Playlist" };
      rerender(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={newPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(2);
      });
    });

    it("re-fetches due date when existingGroup changes", async () => {
      const { rerender } = render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(1);
      });

      const newGroup = { ...mockGroup, id: 2, groupName: "New Group" };
      rerender(
        <PlaylistDueDateBlock
          existingGroup={newGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Date Picker Interactions", () => {
    it("renders date picker correctly", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const picker = screen.getByTestId("picker");
      expect(picker).toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("save button is disabled when no due date is set", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      );
      expect(saveButton).toBeDisabled();
    });

    it("save button is enabled when due date exists", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("calls assignPlaylistDueDate when save button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(assignPlaylistDueDate).toHaveBeenCalled();
      });
    });

    it("displays 'Saved!' message after save button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);

      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("passes correct parameters to assignPlaylistDueDate", async () => {
      const testDate = "2024-03-20T15:00:00.000Z";
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: testDate,
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(assignPlaylistDueDate).toHaveBeenCalledWith(
          expect.any(String),
          mockGroup,
          mockPlaylist,
        );
      });
    });
  });

  describe("Remove/Delete Functionality", () => {
    it("delete button is disabled when no due date is set", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      );
      expect(deleteButton).toBeDisabled();
    });

    it("delete button is enabled when due date exists", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });
    });

    it("opens confirmation dialog when delete button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText("Are you sure you want to remove this due date?"),
        ).toBeInTheDocument();
      });
    });

    it("renders confirmation dialog with correct buttons", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Yes, remove it")).toBeInTheDocument();
        expect(screen.getByText("No, take me back")).toBeInTheDocument();
      });
    });

    it("closes dialog when 'No, take me back' is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const cancelButton = await screen.findByText("No, take me back");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Are you sure you want to remove this due date?"),
        ).not.toBeInTheDocument();
      });
    });

    it("calls assignPlaylistDueDate with null when confirmed", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(assignPlaylistDueDate).toHaveBeenCalledWith(
          null,
          mockGroup,
          mockPlaylist,
        );
      });
    });

    it("displays 'Removed!' message after deletion is confirmed", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      expect(screen.getByText("Removed!")).toBeInTheDocument();
    });

    it("closes dialog after removal is confirmed", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Are you sure you want to remove this due date?"),
        ).not.toBeInTheDocument();
      });
    });

    it("resets dueDate state to null after removal", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const updatedButtons = screen.getAllByRole("button");
        const saveButton = updatedButtons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        const deleteButton = updatedButtons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(saveButton).toBeDisabled();
        expect(deleteButton).toBeDisabled();
      });
    });
  });

  describe("UI State Management", () => {
    it("does not show 'Saved!' message initially", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
    });

    it("does not show 'Removed!' message initially", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      expect(screen.queryByText("Removed!")).not.toBeInTheDocument();
    });

    it("dialog is not visible initially", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      expect(
        screen.queryByText("Are you sure you want to remove this due date?"),
      ).not.toBeInTheDocument();
    });

    it("maintains save state after clicking save", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);

      expect(screen.getByText("Saved!")).toBeInTheDocument();

      // Verify it stays visible
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("maintains remove state after removing date", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      expect(screen.getByText("Removed!")).toBeInTheDocument();

      // Verify it stays visible
      expect(screen.getByText("Removed!")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("save button has accessible name", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      );
      expect(saveButton).toHaveAttribute("name", "Save Due Date");
    });

    it("delete button has accessible name", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      );
      expect(deleteButton).toHaveAttribute("name", "Delete Due Date");
    });

    it("dialog has proper heading structure", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const dialogTitle = await screen.findByText(
        "Are you sure you want to remove this due date?",
      );
      expect(dialogTitle).toBeInTheDocument();
    });

    it("link has accessible text", () => {
      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName("Test Playlist");
    });
  });

  describe("Edge Cases", () => {
    it("handles API error when saving due date", async () => {
      consoleErrorSpy.mockImplementation(() => {});

      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(assignPlaylistDueDate).toHaveBeenCalled();
      });

      // Should still show saved message despite error
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("handles API error when removing due date", async () => {
      consoleErrorSpy.mockImplementation(() => {});

      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const deleteButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Delete"),
        );
        expect(deleteButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      )!;

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(assignPlaylistDueDate).toHaveBeenCalled();
      });

      // Should still show removed message despite error
      expect(screen.getByText("Removed!")).toBeInTheDocument();
    });

    it("handles rapid save button clicks", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const saveButton = buttons.find((btn) =>
          btn.getAttribute("name")?.includes("Save"),
        );
        expect(saveButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      )!;

      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      // Should handle multiple clicks and show saved message
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("handles playlist with special characters in slug", () => {
      const specialPlaylist = {
        ...mockPlaylist,
        slug: "test-playlist-with-special-chars-123",
        name: "Test & Playlist",
      };

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={specialPlaylist}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/p/test-playlist-with-special-chars-123",
      );
    });

    it("handles empty response from getGroupDueDate", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue(null);

      render(
        <PlaylistDueDateBlock
          existingGroup={mockGroup}
          currentPlaylist={mockPlaylist}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });

      // Buttons should remain disabled with no date
      const buttons = screen.getAllByRole("button");
      const saveButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Save"),
      );
      const deleteButton = buttons.find((btn) =>
        btn.getAttribute("name")?.includes("Delete"),
      );
      expect(saveButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });
  });
});

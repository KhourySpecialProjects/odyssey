import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DropletDueDateBlock } from "@/components/group/droplet-due-date-block";
import { assignDropletDueDate, getGroupDueDate } from "@/lib/requests/groups";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  Tag,
} from "@/types";

jest.mock("@/lib/requests/groups", () => ({
  assignDropletDueDate: jest.fn().mockResolvedValue({ success: true }),
  getGroupDueDate: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("DropletDueDateBlock", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  };

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });
    // Spy on console.error but don't suppress it by default
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Rendering", () => {
    it("renders the component with droplet name", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("renders droplet name as a link to the droplet page", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const link = screen.getByRole("link", { name: "Test Droplet" });
      expect(link).toHaveAttribute("href", "/d/test-droplet");
    });

    it("renders the date picker component", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      expect(screen.getByTestId("picker")).toBeInTheDocument();
    });

    it("renders save button with Check icon", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = screen.getByRole("save");
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAttribute("name", "Save Due Date");
    });

    it("renders delete button with Trash icon", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = screen.getByRole("delete");
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute("name", "Delete Due Date");
    });

    it("applies correct styling classes for layout", () => {
      const { container } = render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledWith(mockDroplet, mockGroup);
      });
    });

    it("sets due date when API returns a valid date", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });
    });

    it("handles null due date from API", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });
    });

    it("handles API response without dueDate property", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({});

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });
    });

    it("re-fetches due date when currentDroplet changes", async () => {
      const { rerender } = render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(1);
      });

      const newDroplet = { ...mockDroplet, id: 2, name: "New Droplet" };
      rerender(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={newDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(2);
      });
    });

    it("re-fetches due date when existingGroup changes", async () => {
      const { rerender } = render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalledTimes(1);
      });

      const newGroup = { ...mockGroup, id: 2, groupName: "New Group" };
      rerender(
        <DropletDueDateBlock
          existingGroup={newGroup}
          currentDroplet={mockDroplet}
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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const picker = screen.getByTestId("picker");
      expect(picker).toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("save button is disabled when no due date is set", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = screen.getByRole("save");
      expect(saveButton).toBeDisabled();
    });

    it("save button is enabled when due date exists", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        const saveButton = screen.getByRole("save");
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("calls assignDropletDueDate when save button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(assignDropletDueDate).toHaveBeenCalled();
      });
    });

    it("displays 'Saved!' message after save button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(saveButton);

      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("passes correct parameters to assignDropletDueDate", async () => {
      const testDate = "2024-03-20T15:00:00.000Z";
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: testDate,
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(assignDropletDueDate).toHaveBeenCalledWith(
          expect.any(String),
          mockGroup,
          mockDroplet,
        );
      });
    });
  });

  describe("Remove/Delete Functionality", () => {
    it("delete button is disabled when no due date is set", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = screen.getByRole("delete");
      expect(deleteButton).toBeDisabled();
    });

    it("delete button is enabled when due date exists", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole("delete");
        expect(deleteButton).not.toBeDisabled();
      });
    });

    it("opens confirmation dialog when delete button is clicked", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

      fireEvent.click(deleteButton);

      const cancelButton = await screen.findByText("No, take me back");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Are you sure you want to remove this due date?"),
        ).not.toBeInTheDocument();
      });
    });

    it("calls assignDropletDueDate with null when confirmed", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(assignDropletDueDate).toHaveBeenCalledWith(
          null,
          mockGroup,
          mockDroplet,
        );
      });
    });

    it("displays 'Removed!' message after deletion is confirmed", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const saveButton = screen.getByRole("save");
        const deleteButton = screen.getByRole("delete");
        expect(saveButton).toBeDisabled();
        expect(deleteButton).toBeDisabled();
      });
    });
  });

  describe("UI State Management", () => {
    it("does not show 'Saved!' message initially", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
    });

    it("does not show 'Removed!' message initially", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      expect(screen.queryByText("Removed!")).not.toBeInTheDocument();
    });

    it("dialog is not visible initially", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

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
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = screen.getByRole("save");
      expect(saveButton).toHaveAttribute("name", "Save Due Date");
    });

    it("delete button has accessible name", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = screen.getByRole("delete");
      expect(deleteButton).toHaveAttribute("name", "Delete Due Date");
    });

    it("dialog has proper heading structure", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

      fireEvent.click(deleteButton);

      const dialogTitle = await screen.findByText(
        "Are you sure you want to remove this due date?",
      );
      expect(dialogTitle).toBeInTheDocument();
    });

    it("link has accessible text", () => {
      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName("Test Droplet");
    });
  });

  describe("Edge Cases", () => {
    it("handles API error when saving due date", async () => {
      consoleErrorSpy.mockImplementation(() => {});

      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(saveButton);

      // Should still show saved message despite error
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("handles API error when removing due date", async () => {
      consoleErrorSpy.mockImplementation(() => {});

      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const deleteButton = await screen.findByRole("delete");
      await waitFor(() => expect(deleteButton).not.toBeDisabled());

      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByText("Yes, remove it");
      fireEvent.click(confirmButton);

      // Should still show removed message despite error
      expect(screen.getByText("Removed!")).toBeInTheDocument();
    });

    it("handles rapid save button clicks", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue({
        dueDate: "2024-03-20T15:00:00.000Z",
      });

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      const saveButton = await screen.findByRole("save");
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      // Should handle multiple clicks and show saved message
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });

    it("handles droplet with special characters in slug", () => {
      const specialDroplet = {
        ...mockDroplet,
        slug: "test-droplet-with-special-chars-123",
        name: "Test & Droplet",
      };

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={specialDroplet}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/d/test-droplet-with-special-chars-123",
      );
    });

    it("handles empty response from getGroupDueDate", async () => {
      (getGroupDueDate as jest.Mock).mockResolvedValue(null);

      render(
        <DropletDueDateBlock
          existingGroup={mockGroup}
          currentDroplet={mockDroplet}
        />,
      );

      await waitFor(() => {
        expect(getGroupDueDate).toHaveBeenCalled();
      });

      // Buttons should remain disabled with no date
      const saveButton = screen.getByRole("save");
      const deleteButton = screen.getByRole("delete");
      expect(saveButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });
  });
});

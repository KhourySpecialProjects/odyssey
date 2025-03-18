import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteLessonButton } from "@/components/draft/lesson/delete-lesson";
import { useRouter } from "next/navigation";
import React from "react";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("DeleteLessonButton", () => {
  const mockDeleteLesson = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders a Delete Lesson button", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    expect(screen.getByText("Delete Lesson")).toBeInTheDocument();
  });

  it("opens a confirmation dialog when clicked", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    // Click the delete button
    fireEvent.click(screen.getByText("Delete Lesson"));

    // Check that the dialog appears
    expect(screen.getByText("Delete Lesson")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete this lesson?/),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls deleteLesson when Delete is clicked in the dialog", async () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    // Open the dialog
    fireEvent.click(screen.getByText("Delete Lesson"));

    // Click Delete in the dialog
    fireEvent.click(screen.getByText("Delete"));

    // Verify deleteLesson was called
    expect(mockDeleteLesson).toHaveBeenCalledTimes(1);

    // Verify router.push was called with the correct path
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/draft/d/test-droplet");
    });
  });

  it("does not call deleteLesson when Cancel is clicked", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    // Open the dialog
    fireEvent.click(screen.getByText("Delete Lesson"));

    // Click Cancel in the dialog
    fireEvent.click(screen.getByText("Cancel"));

    // Verify deleteLesson was not called
    expect(mockDeleteLesson).not.toHaveBeenCalled();
  });

  it("disables buttons while deletion is in progress", async () => {
    // This test simulates the deletion process being in progress
    // We'll need to mock useState to control the isDeleting state
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [true, jest.fn()]);

    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    // Open the dialog
    fireEvent.click(screen.getByText("Delete Lesson"));

    // Check that buttons are disabled
    expect(screen.getByText("Cancel")).toBeDisabled();
    expect(screen.getByText("Deleting...")).toBeDisabled();
  });
});

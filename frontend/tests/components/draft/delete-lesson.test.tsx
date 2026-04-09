import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteLessonButton } from "@/components/draft/lesson/delete-lesson";
import { useRouter } from "next/navigation";
import React from "react";

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

    expect(
      screen.getByRole("button", { name: "Delete lesson" }),
    ).toBeInTheDocument();
  });

  it("opens a confirmation dialog when clicked", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    fireEvent.click(screen.getByText("Delete"));

    expect(mockDeleteLesson).toHaveBeenCalledTimes(1);

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

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockDeleteLesson).not.toHaveBeenCalled();
  });

  it("disables buttons while deletion is in progress", async () => {
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [true, jest.fn()]);

    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    expect(screen.getByText("Cancel")).toBeDisabled();
    expect(screen.getByText("Deleting...")).toBeDisabled();
  });
});
